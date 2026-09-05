import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class Horario extends Model<InferAttributes<Horario>, InferCreationAttributes<Horario>> {
  declare id: CreationOptional<string>;
  declare dia_semana: number;
  declare hora_inicio: string; // "09:00"
  declare hora_fin: string; // "17:00"
  declare activo: CreationOptional<boolean>;
  declare creado_en: CreationOptional<Date>;
  declare actualizado_en: CreationOptional<Date>;
}

Horario.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    dia_semana: { type: DataTypes.SMALLINT, allowNull: false },
    hora_inicio: { type: DataTypes.TIME, allowNull: false },
    hora_fin: { type: DataTypes.TIME, allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    creado_en: DataTypes.DATE,
    actualizado_en: DataTypes.DATE,
  },
  { sequelize, tableName: 'horarios' },
);
