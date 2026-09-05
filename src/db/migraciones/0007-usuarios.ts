import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

/* Quien entra al panel. Los clientes NO están aquí: no tienen login. */
export async function up({ context: q }: ContextoMigracion) {
  await q.createTable('usuarios', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: q.sequelize.literal('gen_random_uuid()') },
    correo: { type: DataTypes.STRING(254), allowNull: false },
    hash: { type: DataTypes.STRING(255), allowNull: false },
    nombre: { type: DataTypes.STRING(160), allowNull: false },
    rol: { type: DataTypes.ENUM('admin'), allowNull: false, defaultValue: 'admin' },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  await q.sequelize.query('CREATE UNIQUE INDEX usuarios_correo_unico ON usuarios (lower(correo));');
}

export async function down({ context: q }: ContextoMigracion) {
  await q.dropTable('usuarios');
  await q.sequelize.query('DROP TYPE IF EXISTS enum_usuarios_rol;');
}
