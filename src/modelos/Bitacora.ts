import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class Bitacora extends Model<InferAttributes<Bitacora>, InferCreationAttributes<Bitacora>> {
  declare id: CreationOptional<string>;
  declare actor_id: CreationOptional<string | null>;
  declare actor_correo: CreationOptional<string>;
  declare accion: string;
  declare entidad: string;
  declare entidad_id: CreationOptional<string>;
  declare antes: CreationOptional<object | null>;
  declare despues: CreationOptional<object | null>;
  declare ip: CreationOptional<string>;
  declare creado_en: CreationOptional<Date>;
}

Bitacora.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    actor_id: { type: DataTypes.UUID, allowNull: true },
    actor_correo: { type: DataTypes.STRING(254), allowNull: false, defaultValue: 'sistema' },
    accion: { type: DataTypes.STRING(40), allowNull: false },
    entidad: { type: DataTypes.STRING(40), allowNull: false },
    entidad_id: { type: DataTypes.STRING(80), allowNull: false, defaultValue: '' },
    antes: { type: DataTypes.JSONB, allowNull: true },
    despues: { type: DataTypes.JSONB, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    creado_en: DataTypes.DATE,
  },
  { sequelize, tableName: 'bitacora', updatedAt: false },
);
