import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class Cliente extends Model<InferAttributes<Cliente>, InferCreationAttributes<Cliente>> {
  declare id: CreationOptional<string>;
  declare nombre: string;
  declare correo: string;
  declare telefono: CreationOptional<string>;
  declare notas: CreationOptional<string>;
  declare creado_en: CreationOptional<Date>;
  declare actualizado_en: CreationOptional<Date>;
}

Cliente.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    nombre: { type: DataTypes.STRING(160), allowNull: false },
    correo: { type: DataTypes.STRING(254), allowNull: false },
    telefono: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    notas: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    creado_en: DataTypes.DATE,
    actualizado_en: DataTypes.DATE,
  },
  { sequelize, tableName: 'clientes' },
);
