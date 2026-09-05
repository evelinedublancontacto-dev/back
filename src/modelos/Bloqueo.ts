import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class Bloqueo extends Model<InferAttributes<Bloqueo>, InferCreationAttributes<Bloqueo>> {
  declare id: CreationOptional<string>;
  declare fecha: string; // "2026-12-24"
  declare hora_inicio: CreationOptional<string | null>;
  declare hora_fin: CreationOptional<string | null>;
  declare motivo: CreationOptional<string>;
  declare creado_en: CreationOptional<Date>;
  declare actualizado_en: CreationOptional<Date>;
}

Bloqueo.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    hora_inicio: { type: DataTypes.TIME, allowNull: true },
    hora_fin: { type: DataTypes.TIME, allowNull: true },
    motivo: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    creado_en: DataTypes.DATE,
    actualizado_en: DataTypes.DATE,
  },
  { sequelize, tableName: 'bloqueos' },
);
