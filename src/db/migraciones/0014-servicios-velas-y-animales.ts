import type { ContextoMigracion } from './index';

/* ------------------------------------------------------------------ *
 *  Eveline (11 sep 2026): en la agenda faltaban Sanación con Velas ($800)
 *  y Sanación para Animales ($700). Las velas son siempre a distancia y
 *  asíncronas, por eso llevan modalidad fija en sus reglas; los animales
 *  siguen la modalidad del día (viernes presencial, resto en línea).
 * ------------------------------------------------------------------ */

const NUEVOS = [
  {
    id: 'sanacion-con-velas',
    titulo: 'Sanación con Velas',
    descripcion: 'Ritual de fuego a distancia para transmutar lo denso y acompañar tu proceso. Se realiza de forma asíncrona desde el consultorio; la hora agendada es cuando inicia el ritual.',
    duracion_min: 120,
    precio: 800,
    orden: 7,
    reglas: { modalidad: 'a_distancia' },
  },
  {
    id: 'sanacion-para-animales',
    titulo: 'Sanación para Animales',
    descripcion: 'Sesión de sanación energética para tu compañero animal. Puede ser presencial, en línea o grabada; envía previamente su nombre, foto y el tema a trabajar.',
    duracion_min: 60,
    precio: 700,
    orden: 8,
    reglas: {},
  },
];

export async function up({ context: q }: ContextoMigracion) {
  for (const s of NUEVOS) {
    await q.sequelize.query(
      `INSERT INTO servicios (id, titulo, descripcion, duracion_min, precio, activo, orden, reglas, creado_en, actualizado_en)
       VALUES (:id, :titulo, :descripcion, :duracion_min, :precio, true, :orden, CAST(:reglas AS jsonb), NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET activo = true, precio = EXCLUDED.precio, reglas = EXCLUDED.reglas, actualizado_en = NOW();`,
      { replacements: { ...s, reglas: JSON.stringify(s.reglas) } },
    );
  }
}

/** Se desactivan, no se borran: pueden tener citas. */
export async function down({ context: q }: ContextoMigracion) {
  await q.sequelize.query('UPDATE servicios SET activo = false, actualizado_en = NOW() WHERE id IN (:ids);', {
    replacements: { ids: NUEVOS.map((s) => s.id) },
  });
}
