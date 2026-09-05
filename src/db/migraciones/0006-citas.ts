import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

export const ESTADOS_CITA = ['pendiente', 'confirmada', 'cancelada', 'completada'] as const;

export async function up({ context: q }: ContextoMigracion) {
  await q.createTable('citas', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: q.sequelize.literal('gen_random_uuid()') },
    cliente_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'clientes', key: 'id' },
      onDelete: 'RESTRICT',
    },
    servicio_id: {
      type: DataTypes.STRING(80),
      allowNull: false,
      references: { model: 'servicios', key: 'id' },
      onDelete: 'RESTRICT',
    },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    hora: { type: DataTypes.TIME, allowNull: false },
    estado: { type: DataTypes.ENUM(...ESTADOS_CITA), allowNull: false, defaultValue: 'pendiente' },
    notas: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    origen: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'web' },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  /* Aquí vive la garantía contra la doble reserva: dos citas vivas no pueden
     compartir fecha y hora. Las canceladas y completadas no cuentan, así que
     un horario cancelado vuelve a quedar libre sin borrar el historial. */
  await q.sequelize.query(
    "CREATE UNIQUE INDEX citas_horario_vivo_unico ON citas (fecha, hora) WHERE estado IN ('pendiente', 'confirmada');",
  );
  await q.addIndex('citas', ['fecha', 'estado']);
  await q.addIndex('citas', ['cliente_id']);
}

export async function down({ context: q }: ContextoMigracion) {
  await q.dropTable('citas');
  await q.sequelize.query('DROP TYPE IF EXISTS enum_citas_estado;');
}
