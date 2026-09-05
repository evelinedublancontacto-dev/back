import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

/* Días u horas cerradas: vacaciones, feriados, citas externas.
   Sin hora_inicio/hora_fin se bloquea el día completo. */
export async function up({ context: q }: ContextoMigracion) {
  await q.createTable('bloqueos', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: q.sequelize.literal('gen_random_uuid()') },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    hora_inicio: { type: DataTypes.TIME, allowNull: true },
    hora_fin: { type: DataTypes.TIME, allowNull: true },
    motivo: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  await q.sequelize.query(
    'ALTER TABLE bloqueos ADD CONSTRAINT bloqueos_rango_completo CHECK ((hora_inicio IS NULL AND hora_fin IS NULL) OR (hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_fin > hora_inicio));',
  );
  await q.addIndex('bloqueos', ['fecha']);
}

export async function down({ context: q }: ContextoMigracion) {
  await q.dropTable('bloqueos');
}
