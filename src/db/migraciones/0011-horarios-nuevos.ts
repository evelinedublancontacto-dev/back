import type { ContextoMigracion } from './index';

/* ------------------------------------------------------------------ *
 *  Eveline cambió sus horarios de atención (8 sep 2026). Antes había una
 *  sola ventana de lunes a viernes de 09:00 a 17:00; ahora cada día tiene
 *  su propio bloque y el jueves deja de atenderse.
 *
 *  dia_semana: 0 domingo … 6 sábado. La hora_fin es exclusiva: el
 *  generador de bloques (servicios/agenda.ts) avanza de 60 en 60 y solo
 *  emite la hora si el bloque cabe completo, así que 10:00–13:00 da las
 *  10, las 11 y las 12.
 * ------------------------------------------------------------------ */

const NUEVOS = [
  { dia_semana: 1, hora_inicio: '10:00', hora_fin: '13:00' }, // lunes:     10, 11, 12
  { dia_semana: 2, hora_inicio: '15:00', hora_fin: '19:00' }, // martes:    15, 16, 17, 18
  { dia_semana: 3, hora_inicio: '10:00', hora_fin: '13:00' }, // miércoles: 10, 11, 12
  { dia_semana: 5, hora_inicio: '09:00', hora_fin: '13:00' }, // viernes:    9, 10, 11, 12
];

const ANTERIORES = [1, 2, 3, 4, 5].map((dia_semana) => ({
  dia_semana,
  hora_inicio: '09:00',
  hora_fin: '17:00',
}));

/** Reemplaza la agenda semanal completa. No toca las citas ya reservadas:
 *  las que queden fuera de las ventanas nuevas siguen en pie y hay que
 *  reagendarlas a mano desde el panel. */
async function reemplazar(q: ContextoMigracion['context'], filas: typeof NUEVOS) {
  await q.sequelize.query('DELETE FROM horarios;');
  await q.bulkInsert(
    'horarios',
    filas.map((f) => ({ ...f, activo: true, creado_en: new Date(), actualizado_en: new Date() })),
  );
}

export async function up({ context: q }: ContextoMigracion) {
  await reemplazar(q, NUEVOS);
}

export async function down({ context: q }: ContextoMigracion) {
  await reemplazar(q, ANTERIORES);
}
