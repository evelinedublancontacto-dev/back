import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

/* Horarios extraordinarios de una fecha concreta. Los bloqueos solo saben
   quitar disponibilidad; esto sirve para agregarla o moverla un día suelto,
   sin tocar la semana completa. Si una fecha tiene filas aquí, mandan sobre
   las ventanas semanales de la tabla horarios. */
export async function up({ context: q }: ContextoMigracion) {
  await q.createTable('horarios_fecha', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: q.sequelize.literal('gen_random_uuid()') },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    hora_inicio: { type: DataTypes.TIME, allowNull: false },
    hora_fin: { type: DataTypes.TIME, allowNull: false },
    modalidad: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'en_linea' },
    nota: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  await q.sequelize.query(
    "ALTER TABLE horarios_fecha ADD CONSTRAINT horarios_fecha_rango_valido CHECK (hora_fin > hora_inicio), ADD CONSTRAINT horarios_fecha_modalidad_valida CHECK (modalidad IN ('presencial', 'en_linea'));",
  );
  await q.addIndex('horarios_fecha', ['fecha']);
}

export async function down({ context: q }: ContextoMigracion) {
  await q.dropTable('horarios_fecha');
}
