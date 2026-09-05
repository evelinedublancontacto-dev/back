import { DataTypes, Model, type CreationOptional, type ForeignKey, type InferAttributes, type InferCreationAttributes, type NonAttribute } from 'sequelize';
import { sequelize } from '../db/sequelize';
import type { Usuario } from './Usuario';

export class Sesion extends Model<InferAttributes<Sesion>, InferCreationAttributes<Sesion>> {
  declare id: CreationOptional<string>;
  declare usuario_id: ForeignKey<string>;
  declare token_hash: string;
  declare expira_en: Date;
  declare ip: CreationOptional<string>;
  declare user_agent: CreationOptional<string>;
  declare ultimo_uso: CreationOptional<Date>;
  declare creado_en: CreationOptional<Date>;
  declare actualizado_en: CreationOptional<Date>;
  declare usuario?: NonAttribute<Usuario>;
}

Sesion.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    usuario_id: { type: DataTypes.UUID, allowNull: false },
    token_hash: { type: DataTypes.STRING(64), allowNull: false },
    expira_en: { type: DataTypes.DATE, allowNull: false },
    ip: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    user_agent: { type: DataTypes.STRING(400), allowNull: false, defaultValue: '' },
    ultimo_uso: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    creado_en: DataTypes.DATE,
    actualizado_en: DataTypes.DATE,
  },
  { sequelize, tableName: 'sesiones' },
);
