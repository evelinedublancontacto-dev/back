import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

/* Se guarda el hash del token, nunca el token: una fuga de la tabla no
   permite entrar con las sesiones de nadie. */
export async function up({ context: q }: ContextoMigracion) {
  await q.createTable('sesiones', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: q.sequelize.literal('gen_random_uuid()') },
    usuario_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' }, onDelete: 'CASCADE' },
    token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    expira_en: { type: DataTypes.DATE, allowNull: false },
    ip: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    user_agent: { type: DataTypes.STRING(400), allowNull: false, defaultValue: '' },
    ultimo_uso: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  await q.addIndex('sesiones', ['usuario_id']);
  await q.addIndex('sesiones', ['expira_en']);
}

export async function down({ context: q }: ContextoMigracion) {
  await q.dropTable('sesiones');
}
