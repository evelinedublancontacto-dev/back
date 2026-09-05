import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

export async function up({ context: q }: ContextoMigracion) {
  await q.createTable('posts', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: q.sequelize.literal('gen_random_uuid()') },
    titulo: { type: DataTypes.STRING(300), allowNull: false },
    slug: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    extracto: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    contenido: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    imagen_url: { type: DataTypes.STRING(1000), allowNull: false, defaultValue: '' },
    categoria: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'sanacion-energetica' },
    publicado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    publicado_en: { type: DataTypes.DATE, allowNull: true },
    /* Identificador en el sistema anterior (wp-123 o id de PocketBase). */
    origen_id: { type: DataTypes.STRING(80), allowNull: true },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  await q.addIndex('posts', ['publicado', 'publicado_en']);
  await q.addIndex('posts', ['categoria']);
}

export async function down({ context: q }: ContextoMigracion) {
  await q.dropTable('posts');
}
