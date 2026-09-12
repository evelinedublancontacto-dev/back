/* ------------------------------------------------------------------ *
 *  src/servicios/fechas.ts
 *  La agenda vive en hora de la Ciudad de México. Las fechas viajan como
 *  texto "AAAA-MM-DD" y las horas como "HH:MM"; nunca como Date, para que
 *  el servidor pueda estar en cualquier zona horaria sin correr una cita.
 * ------------------------------------------------------------------ */

export const ZONA = 'America/Mexico_City';

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function esFechaISO(v: string): boolean {
  if (!RE_FECHA.test(v)) return false;
  const [a, m, d] = v.split('-').map(Number) as [number, number, number];
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d;
}

export function esHora(v: string): boolean {
  return RE_HORA.test(v);
}

/** 0 domingo … 6 sábado. Independiente de la zona horaria: es la fecha civil. */
export function diaSemana(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

const formatoCDMX = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Fecha y hora actuales en la Ciudad de México, como texto. */
export function ahoraEnCDMX(instante = new Date()): { fecha: string; hora: string } {
  const partes = Object.fromEntries(formatoCDMX.formatToParts(instante).map((p) => [p.type, p.value]));
  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    hora: `${partes.hour}:${partes.minute}`,
  };
}

const formatoLargo = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** "2026-09-21" → "lunes, 21 de septiembre". Fecha civil, sin zona horaria. */
export function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return formatoLargo.format(new Date(Date.UTC(a, m - 1, d)));
}

/** Suma (o resta) días a una fecha civil "AAAA-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Último día para depositar: `dias` antes de la cita, pero nunca antes de hoy
    (si la cita es pasado mañana o antes, el límite es hoy). */
export function fechaLimiteDeposito(fechaCita: string, hoy: string, dias: number): string {
  const limite = sumarDias(fechaCita, -dias);
  return limite < hoy ? hoy : limite;
}

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

export function deMinutos(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
