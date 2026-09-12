import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { crearApp } from '../src/app';
import { migrar } from '../src/db/migraciones/index';
import { sembrarServicios } from '../src/db/semillas/servicios';
import { sembrarHorarios } from '../src/db/semillas/horarios';
import { Cita, Cliente } from '../src/modelos';
import { ahoraEnCDMX, diaSemana } from '../src/servicios/fechas';

const app = crearApp();
const CORREO = 'prueba.concurrencia@ejemplo.test';

/** Primer día hábil (lunes a jueves) al menos 10 días adelante: nunca hoy, nunca viernes. */
function fechaDePrueba(): string {
  const d = new Date(`${ahoraEnCDMX().fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 10);
  while (![1, 2, 3, 4].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const FECHA = fechaDePrueba();

function reservar(extra: Record<string, unknown> = {}) {
  return app.handle(
    new Request('http://localhost/v1/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Prueba Concurrencia',
        email: CORREO,
        telefono: '7711439116',
        servicio: 'psicoterapia',
        fecha: FECHA,
        hora: '10:00',
        notas: 'creada por bun test',
        ...extra,
      }),
    }),
  );
}

async function limpiar() {
  await Cita.destroy({ where: { fecha: FECHA } });
  await Cliente.destroy({ where: { correo: CORREO } });
}

beforeAll(async () => {
  await migrar();
  await sembrarServicios();
  await sembrarHorarios();
  await limpiar();
});
afterAll(limpiar);

describe('GET /v1/servicios', () => {
  it('devuelve los activos con la forma que espera el front', async () => {
    const res = await app.handle(new Request('http://localhost/v1/servicios'));
    const { servicios } = (await res.json()) as { servicios: Array<Record<string, unknown>> };
    expect(servicios.length).toBeGreaterThanOrEqual(4);
    expect(servicios.map((s) => s.id)).not.toContain('terapia-parejas'); // Eveline no lo ofrece
    expect(servicios.map((s) => s.id)).toEqual(expect.arrayContaining(['sanacion-con-velas', 'sanacion-para-animales']));
    expect(servicios[0]).toMatchObject({ id: expect.any(String), titulo: expect.any(String), duracion: expect.any(Number), precio: expect.any(Number) });
  });
});

describe('GET /v1/disponibilidad', () => {
  it('rechaza fechas mal formadas', async () => {
    const res = await app.handle(new Request('http://localhost/v1/disponibilidad?fecha=hoy'));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { codigo: string }).codigo).toBe('fecha_invalida');
  });
  it('en un día hábil ofrece bloques de 9 a 16', async () => {
    const res = await app.handle(new Request(`http://localhost/v1/disponibilidad?fecha=${FECHA}`));
    const r = (await res.json()) as { slots: Array<{ hora: string }>; disponible: boolean; modalidad?: string };
    expect(r.disponible).toBe(true);
    expect(r.slots.map((s) => s.hora)).toContain('10:00');
    expect(r.modalidad).toBe('en_linea'); // FECHA nunca es viernes
  });
  it('los viernes la atención es presencial', async () => {
    const d = new Date(`${FECHA}T12:00:00Z`);
    while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
    const viernes = d.toISOString().slice(0, 10);
    const res = await app.handle(new Request(`http://localhost/v1/disponibilidad?fecha=${viernes}`));
    expect(((await res.json()) as { modalidad?: string }).modalidad).toBe('presencial');
  });
  it('cuencos tibetanos no se ofrece fuera de viernes', async () => {
    expect(diaSemana(FECHA)).not.toBe(5);
    const res = await app.handle(new Request(`http://localhost/v1/disponibilidad?fecha=${FECHA}&servicioId=cuencos-tibetanos`));
    const r = (await res.json()) as { slots: unknown[]; mensaje: string };
    expect(r.slots).toEqual([]);
    expect(r.mensaje).toContain('viernes');
  });
});

describe('POST /v1/citas', () => {
  it('rechaza fechas pasadas', async () => {
    const res = await reservar({ fecha: '2020-01-06' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { codigo: string }).codigo).toBe('fecha_pasada');
  });

  it('rechaza cuerpos inválidos con 400 y código validacion', async () => {
    const res = await reservar({ email: 'no-es-correo' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { codigo: string }).codigo).toBe('validacion');
  });

  it('un bot que llena el campo trampa recibe 201 y no guarda nada', async () => {
    const res = await reservar({ sitioWeb: 'http://spam' });
    expect(res.status).toBe(201);
    expect(await Cita.count({ where: { fecha: FECHA } })).toBe(0);
  });

  it('de 20 reservas simultáneas al mismo horario entra exactamente una', async () => {
    const respuestas = await Promise.all(Array.from({ length: 20 }, () => reservar()));
    const estados = respuestas.map((r) => r.status);
    expect(estados.filter((s) => s === 201)).toHaveLength(1);
    expect(estados.filter((s) => s === 409)).toHaveLength(19);

    const cuerpo409 = (await respuestas.find((r) => r.status === 409)!.json()) as { codigo: string };
    expect(cuerpo409.codigo).toBe('horario_ocupado');

    expect(await Cita.count({ where: { fecha: FECHA, hora: '10:00' } })).toBe(1);
    expect(await Cliente.count({ where: { correo: CORREO } })).toBe(1); // sin clientes duplicados
  });

  it('después de reservar, la disponibilidad marca esa hora como ocupada', async () => {
    const res = await app.handle(new Request(`http://localhost/v1/disponibilidad?fecha=${FECHA}`));
    const r = (await res.json()) as { slots: Array<{ hora: string; disponible: boolean }> };
    expect(r.slots.find((s) => s.hora === '10:00')?.disponible).toBe(false);
    expect(r.slots.find((s) => s.hora === '11:00')?.disponible).toBe(true);
  });

  it('la misma persona no puede tener dos citas agendadas a la vez', async () => {
    const res = await reservar({ hora: '11:00' });
    expect(res.status).toBe(409);
    const cuerpo = (await res.json()) as { codigo: string; error: string };
    expect(cuerpo.codigo).toBe('cita_ya_agendada');
    expect(cuerpo.error).toContain('10:00');
    expect(await Cita.count({ where: { fecha: FECHA } })).toBe(1);
  });

  it('un horario cancelado vuelve a quedar libre', async () => {
    const cita = await Cita.findOne({ where: { fecha: FECHA, hora: '10:00' } });
    await cita!.update({ estado: 'cancelada' });
    const res = await reservar();
    expect(res.status).toBe(201);
    expect(await Cita.count({ where: { fecha: FECHA, hora: '10:00' } })).toBe(2);
  });
});
