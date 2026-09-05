import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { crearApp } from '../src/app';
import { migrar } from '../src/db/migraciones/index';
import { sembrarServicios } from '../src/db/semillas/servicios';
import { sembrarHorarios } from '../src/db/semillas/horarios';
import { Bitacora, Cita, Cliente, Sesion, Usuario } from '../src/modelos';
import { crearUsuarioAdmin } from '../src/modulos/auth/servicio';
import { crearLimitador } from '../src/middleware/rateLimit';
import { ErrorHttp } from '../src/errores';

const app = crearApp();
const ADMIN = { correo: 'admin.prueba@ejemplo.test', contrasena: 'una-contraseña-larga-123' };
let cookie = '';

const json = (metodo: string, ruta: string, cuerpo?: unknown, conCookie = true) =>
  app.handle(
    new Request(`http://localhost${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(conCookie && cookie ? { Cookie: cookie } : {}) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    }),
  );

async function limpiar() {
  await Cita.destroy({ where: { origen: 'admin' } });
  await Cliente.destroy({ where: { correo: 'cliente.admin@ejemplo.test' } });
  const u = await Usuario.findOne({ where: { correo: ADMIN.correo } });
  if (u) {
    await Sesion.destroy({ where: { usuario_id: u.id } });
    await u.destroy();
  }
}

beforeAll(async () => {
  await migrar();
  await sembrarServicios();
  await sembrarHorarios();
  await limpiar();
  await crearUsuarioAdmin(ADMIN.correo, ADMIN.contrasena, 'Admin de prueba');
});
afterAll(limpiar);

describe('auth', () => {
  it('rechaza contraseña incorrecta y correo inexistente con el mismo mensaje', async () => {
    const mala = await json('POST', '/v1/auth/entrar', { correo: ADMIN.correo, contrasena: 'incorrecta-incorrecta' }, false);
    const nadie = await json('POST', '/v1/auth/entrar', { correo: 'nadie@ejemplo.test', contrasena: 'incorrecta-incorrecta' }, false);
    expect(mala.status).toBe(401);
    expect(nadie.status).toBe(401);
    expect(await mala.json()).toEqual(await nadie.json());
  });

  it('con credenciales correctas deja cookie httpOnly y devuelve al usuario sin hash', async () => {
    const res = await json('POST', '/v1/auth/entrar', ADMIN, false);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('sesion=');
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    cookie = setCookie.split(';')[0]!;
    const { usuario } = (await res.json()) as { usuario: Record<string, unknown> };
    expect(usuario.correo).toBe(ADMIN.correo);
    expect(usuario).not.toHaveProperty('hash');
  });

  it('/yo devuelve el usuario con cookie y null sin ella', async () => {
    const con = (await (await json('GET', '/v1/auth/yo')).json()) as { usuario: { correo: string } | null };
    const sin = (await (await json('GET', '/v1/auth/yo', undefined, false)).json()) as { usuario: null };
    expect(con.usuario?.correo).toBe(ADMIN.correo);
    expect(sin.usuario).toBeNull();
  });

  it('el limitador de intentos corta al sexto en la misma ventana', () => {
    const limitar = crearLimitador('prueba', 5, 60_000, { activoEnPruebas: true });
    for (let i = 0; i < 5; i++) limitar('ip|correo');
    expect(() => limitar('ip|correo')).toThrow(ErrorHttp);
    expect(() => limitar('otra-ip|correo')).not.toThrow();
  });
});

describe('/v1/admin sin sesión', () => {
  const rutas: Array<[string, string]> = [
    ['GET', '/v1/admin/citas'],
    ['POST', '/v1/admin/citas'],
    ['PATCH', '/v1/admin/citas/00000000-0000-0000-0000-000000000000'],
    ['DELETE', '/v1/admin/citas/00000000-0000-0000-0000-000000000000'],
    ['GET', '/v1/admin/servicios'],
    ['POST', '/v1/admin/servicios'],
    ['GET', '/v1/admin/horarios'],
    ['GET', '/v1/admin/bloqueos'],
    ['GET', '/v1/admin/clientes'],
    ['GET', '/v1/admin/bitacora'],
  ];
  for (const [metodo, ruta] of rutas) {
    it(`${metodo} ${ruta} responde 401`, async () => {
      const res = await json(metodo, ruta, metodo === 'GET' || metodo === 'DELETE' ? undefined : {}, false);
      expect(res.status).toBe(401);
      expect(((await res.json()) as { codigo: string }).codigo).toBe('sin_sesion');
    });
  }
  it('una cookie inventada tampoco entra', async () => {
    const res = await app.handle(new Request('http://localhost/v1/admin/citas', { headers: { Cookie: 'sesion=inventada' } }));
    expect(res.status).toBe(401);
  });
});

describe('/v1/admin con sesión de admin', () => {
  let citaId = '';

  it('crea una cita a mano, por defecto confirmada, y queda en bitácora', async () => {
    const res = await json('POST', '/v1/admin/citas', {
      nombre: 'Cliente Admin',
      email: 'cliente.admin@ejemplo.test',
      telefono: '7711439116',
      servicio: 'sanacion-energetica',
      fecha: '2030-03-04',
      hora: '18:00', // fuera del horario público: el admin sí puede
    });
    expect(res.status).toBe(201);
    const { cita } = (await res.json()) as { cita: { id: string; estado: string; origen: string } };
    expect(cita.estado).toBe('confirmada');
    expect(cita.origen).toBe('admin');
    citaId = cita.id;
    await Bun.sleep(50);
    expect(await Bitacora.count({ where: { entidad: 'cita', entidad_id: citaId, accion: 'crear' } })).toBe(1);
  });

  it('no permite dos citas vivas a la misma hora ni desde el admin', async () => {
    const res = await json('POST', '/v1/admin/citas', {
      nombre: 'Otro',
      email: 'cliente.admin@ejemplo.test',
      telefono: '7711439116',
      servicio: 'psicoterapia',
      fecha: '2030-03-04',
      hora: '18:00',
    });
    expect(res.status).toBe(409);
  });

  it('cambia el estado y la bitácora guarda antes y después', async () => {
    const res = await json('PATCH', `/v1/admin/citas/${citaId}`, { estado: 'completada' });
    expect(res.status).toBe(200);
    await Bun.sleep(50);
    const reg = await Bitacora.findOne({ where: { entidad: 'cita', entidad_id: citaId, accion: 'actualizar' } });
    expect((reg?.antes as { estado: string }).estado).toBe('confirmada');
    expect((reg?.despues as { estado: string }).estado).toBe('completada');
  });

  it('la bitácora no se puede modificar ni borrar', async () => {
    const reg = await Bitacora.findOne({ where: { entidad: 'cita', entidad_id: citaId } });
    await expect(reg!.update({ accion: 'borrar' })).rejects.toThrow(/no se modifica ni se borra/);
    await expect(reg!.destroy()).rejects.toThrow(/no se modifica ni se borra/);
  });

  it('lista citas con filtro de estado y paginación', async () => {
    const res = await json('GET', '/v1/admin/citas?estado=completada&por_pagina=5');
    const r = (await res.json()) as { citas: Array<{ id: string }>; total: number; por_pagina: number };
    expect(r.por_pagina).toBe(5);
    expect(r.citas.some((c) => c.id === citaId)).toBe(true);
  });

  it('no borra un servicio con citas: sugiere desactivarlo', async () => {
    const res = await json('DELETE', '/v1/admin/servicios/sanacion-energetica');
    expect(res.status).toBe(409);
    expect(((await res.json()) as { codigo: string }).codigo).toBe('servicio_con_citas');
  });

  it('crea, edita y borra un bloqueo', async () => {
    const creado = await json('POST', '/v1/admin/bloqueos', { fecha: '2030-12-24', motivo: 'Nochebuena' });
    expect(creado.status).toBe(201);
    const { bloqueo } = (await creado.json()) as { bloqueo: { id: string; hora_inicio: null } };
    expect(bloqueo.hora_inicio).toBeNull();
    const dispo = (await (await json('GET', '/v1/disponibilidad?fecha=2030-12-24', undefined, false)).json()) as { slots: unknown[]; mensaje: string };
    expect(dispo.slots).toEqual([]);
    expect(await (await json('DELETE', `/v1/admin/bloqueos/${bloqueo.id}`)).json()).toEqual({ ok: true });
  });

  it('salir invalida la cookie', async () => {
    expect((await json('POST', '/v1/auth/salir')).status).toBe(200);
    expect((await json('GET', '/v1/admin/citas')).status).toBe(401);
  });
});
