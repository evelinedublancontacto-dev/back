import type { ContextoMigracion } from './index';

/* ------------------------------------------------------------------ *
 *  Correcciones de Eveline (10 sep 2026) sobre la lista de servicios:
 *  - La sesión de psicoterapia cuesta $600 MXN, no $800.
 *  - La sesión especial de cumpleaños cuesta $700 MXN, no $900.
 *  - No ofrece "Meditación Guiada Personalizada" ni "Terapia de Parejas".
 *    Se desactivan en vez de borrarse porque citas.servicio_id las
 *    referencia y el panel puede volver a activarlas si hiciera falta.
 * ------------------------------------------------------------------ */

const PRECIOS_NUEVOS: Record<string, number> = { psicoterapia: 600, 'sesion-cumpleanos': 700 };
const PRECIOS_ANTERIORES: Record<string, number> = { psicoterapia: 800, 'sesion-cumpleanos': 900 };
const NO_OFRECIDOS = ['meditacion-guiada', 'terapia-parejas'];

async function aplicar(q: ContextoMigracion['context'], precios: Record<string, number>, activo: boolean) {
  for (const [id, precio] of Object.entries(precios)) {
    await q.sequelize.query('UPDATE servicios SET precio = :precio, actualizado_en = NOW() WHERE id = :id;', {
      replacements: { id, precio },
    });
  }
  await q.sequelize.query('UPDATE servicios SET activo = :activo, actualizado_en = NOW() WHERE id IN (:ids);', {
    replacements: { activo, ids: NO_OFRECIDOS },
  });
}

export async function up({ context: q }: ContextoMigracion) {
  await aplicar(q, PRECIOS_NUEVOS, false);
}

export async function down({ context: q }: ContextoMigracion) {
  await aplicar(q, PRECIOS_ANTERIORES, true);
}
