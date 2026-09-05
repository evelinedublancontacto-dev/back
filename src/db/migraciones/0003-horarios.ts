import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

/* Ventanas semanales de atención. dia_semana: 0 domingo … 6 sábado. */
export async function up({ context: q }: ContextoMigracion) {
  await q.createTable('horarios', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: q.sequelize.literal('gen_random_uuid()') },
    dia_semana: { type: DataTypes.SMALLINT, allowNull: false },
    hora_inicio: { type: DataTypes.TIME, allowNull: false },
    hora_fin: { type: DataTypes.TIME, allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  await q.sequelize.query(
    'ALTER TABLE horarios ADD CONSTRAINT horarios_dia_valido CHECK (dia_semana BETWEEN 0 AND 6), ADD CONSTRAINT horarios_rango_valido CHECK (hora_fin > hora_inicio);',
  );
  await q.addIndex('horarios', ['dia_semana', 'activo']);
}

export async function down({ context: q }: ContextoMigracion) {
  await q.dropTable('horarios');
}
