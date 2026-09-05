import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

/* Personas que reservan. Separadas de usuarios: un cliente no tiene login. */
export async function up({ context: q }: ContextoMigracion) {
  await q.createTable('clientes', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: q.sequelize.literal('gen_random_uuid()') },
    nombre: { type: DataTypes.STRING(160), allowNull: false },
    correo: { type: DataTypes.STRING(254), allowNull: false },
    telefono: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    notas: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  /* Un cliente por correo, sin distinguir mayúsculas. */
  await q.sequelize.query('CREATE UNIQUE INDEX clientes_correo_unico ON clientes (lower(correo));');
}

export async function down({ context: q }: ContextoMigracion) {
  await q.dropTable('clientes');
}
