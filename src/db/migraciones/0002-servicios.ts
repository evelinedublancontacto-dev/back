import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

export async function up({ context: q }: ContextoMigracion) {
  await q.createTable('servicios', {
    id: { type: DataTypes.STRING(80), primaryKey: true }, // slug: "psicoterapia"
    titulo: { type: DataTypes.STRING(160), allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    duracion_min: { type: DataTypes.INTEGER, allowNull: false },
    precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    /* { dias_permitidos: [5], modalidad: "presencial", mensaje_dias: "..." } */
    reglas: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
}

export async function down({ context: q }: ContextoMigracion) {
  await q.dropTable('servicios');
}
