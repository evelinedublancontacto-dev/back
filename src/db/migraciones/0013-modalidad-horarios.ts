import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

/* ------------------------------------------------------------------ *
 *  La modalidad depende del día, no del servicio: los viernes Eveline
 *  atiende presencial en consultorio y el resto de la semana en línea
 *  (10 sep 2026). Se guarda en cada ventana de horario para que el panel
 *  pueda cambiarla sin tocar código.
 * ------------------------------------------------------------------ */

export async function up({ context: q }: ContextoMigracion) {
  await q.addColumn('horarios', 'modalidad', { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'en_linea' });
  await q.sequelize.query("ALTER TABLE horarios ADD CONSTRAINT horarios_modalidad_valida CHECK (modalidad IN ('presencial', 'en_linea'));");
  await q.sequelize.query("UPDATE horarios SET modalidad = 'presencial', actualizado_en = NOW() WHERE dia_semana = 5;");
}

export async function down({ context: q }: ContextoMigracion) {
  await q.sequelize.query('ALTER TABLE horarios DROP CONSTRAINT IF EXISTS horarios_modalidad_valida;');
  await q.removeColumn('horarios', 'modalidad');
}
