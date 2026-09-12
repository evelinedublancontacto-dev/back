import { describe, expect, it } from 'bun:test';
import { calcularDisponibilidad, generarBloques, modalidadDelDia } from '../src/servicios/agenda';
import { ahoraEnCDMX, diaSemana, esFechaISO, esHora } from '../src/servicios/fechas';

const LUNES = '2026-10-05';
const VIERNES = '2026-10-09';
const JORNADA = [{ hora_inicio: '09:00', hora_fin: '17:00' }];

describe('fechas', () => {
  it('reconoce fechas y horas válidas', () => {
    expect(esFechaISO('2026-02-29')).toBe(false);
    expect(esFechaISO('2028-02-29')).toBe(true);
    expect(esHora('24:00')).toBe(false);
    expect(esHora('09:30')).toBe(true);
  });
  it('calcula el día de la semana sin depender de la zona horaria', () => {
    expect(diaSemana(LUNES)).toBe(1);
    expect(diaSemana(VIERNES)).toBe(5);
  });
  it('devuelve la hora de la Ciudad de México como texto', () => {
    const a = ahoraEnCDMX(new Date('2026-07-01T05:30:00Z')); // UTC-6 en julio
    expect(a).toEqual({ fecha: '2026-06-30', hora: '23:30' });
  });
});

describe('generarBloques', () => {
  it('parte la jornada en bloques de una hora sin pasarse del cierre', () => {
    expect(generarBloques(JORNADA)).toEqual(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']);
  });
  it('une ventanas partidas y quita duplicados', () => {
    const b = generarBloques([
      { hora_inicio: '09:00', hora_fin: '12:00' },
      { hora_inicio: '11:00', hora_fin: '14:00' },
    ]);
    expect(b).toEqual(['09:00', '10:00', '11:00', '12:00', '13:00']);
  });
});

describe('calcularDisponibilidad', () => {
  const base = { fecha: LUNES, horarios: JORNADA, bloqueos: [], horasOcupadas: [] };

  it('marca ocupadas las horas con cita viva y sigue disponible el día', () => {
    const r = calcularDisponibilidad({ ...base, horasOcupadas: ['10:00'] });
    expect(r.disponible).toBe(true);
    expect(r.slots.find((s) => s.hora === '10:00')?.disponible).toBe(false);
    expect(r.slots.find((s) => s.hora === '11:00')?.disponible).toBe(true);
  });

  it('un servicio solo de viernes no ofrece nada un lunes y explica por qué', () => {
    const r = calcularDisponibilidad({ ...base, reglas: { dias_permitidos: [5], mensaje_dias: 'Solo viernes.' } });
    expect(r.slots).toEqual([]);
    expect(r.disponible).toBe(false);
    expect(r.mensaje).toBe('Solo viernes.');
  });

  it('el mismo servicio sí ofrece bloques en viernes', () => {
    const r = calcularDisponibilidad({ ...base, fecha: VIERNES, reglas: { dias_permitidos: [5] } });
    expect(r.slots.length).toBe(8);
  });

  it('un bloqueo de día completo cierra la agenda', () => {
    const r = calcularDisponibilidad({ ...base, bloqueos: [{ hora_inicio: null, hora_fin: null }] });
    expect(r.slots).toEqual([]);
    expect(r.mensaje).toContain('no hay atención');
  });

  it('un bloqueo parcial quita solo los bloques que se traslapan', () => {
    const r = calcularDisponibilidad({ ...base, bloqueos: [{ hora_inicio: '12:30', hora_fin: '14:00' }] });
    const horas = r.slots.map((s) => s.hora);
    expect(horas).not.toContain('12:00'); // 12:00-13:00 se traslapa con 12:30
    expect(horas).not.toContain('13:00');
    expect(horas).toContain('11:00');
    expect(horas).toContain('14:00');
  });

  it('si la fecha es hoy, descarta las horas que ya pasaron', () => {
    const r = calcularDisponibilidad({ ...base, ahora: { fecha: LUNES, hora: '11:15' } });
    expect(r.slots.map((s) => s.hora)).toEqual(['12:00', '13:00', '14:00', '15:00', '16:00']);
  });

  it('sin horarios para ese día no hay disponibilidad', () => {
    const r = calcularDisponibilidad({ ...base, horarios: [] });
    expect(r.slots).toEqual([]);
    expect(r.disponible).toBe(false);
    expect(r.modalidad).toBeUndefined();
  });

  it('la modalidad sale de las ventanas del día: viernes presencial, el resto en línea', () => {
    const viernes = calcularDisponibilidad({ ...base, fecha: VIERNES, horarios: [{ hora_inicio: '09:00', hora_fin: '13:00', modalidad: 'presencial' }] });
    expect(viernes.modalidad).toBe('presencial');
    const lunes = calcularDisponibilidad({ ...base, horarios: [{ hora_inicio: '10:00', hora_fin: '13:00', modalidad: 'en_linea' }] });
    expect(lunes.modalidad).toBe('en_linea');
    expect(calcularDisponibilidad(base).modalidad).toBe('en_linea'); // sin dato: en línea
  });

  it('la modalidad se conserva aunque el día no tenga bloques', () => {
    const r = calcularDisponibilidad({ ...base, horarios: [{ ...JORNADA[0]!, modalidad: 'presencial' }], bloqueos: [{ hora_inicio: null, hora_fin: null }] });
    expect(r.slots).toEqual([]);
    expect(r.modalidad).toBe('presencial');
  });
});

describe('modalidadDelDia', () => {
  it('basta una ventana presencial para que el día lo sea', () => {
    expect(modalidadDelDia([{ hora_inicio: '09:00', hora_fin: '12:00', modalidad: 'en_linea' }, { hora_inicio: '16:00', hora_fin: '18:00', modalidad: 'presencial' }])).toBe('presencial');
    expect(modalidadDelDia([])).toBeUndefined();
  });
});
