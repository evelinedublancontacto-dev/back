import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class Usuario extends Model<InferAttributes<Usuario>, InferCreationAttributes<Usuario>> {
  declare id: CreationOptional<string>;
  declare correo: string;
  declare hash: string;
  declare nombre: string;
  declare rol: CreationOptional<'admin'>;
  declare activo: CreationOptional<boolean>;
  declare creado_en: CreationOptional<Date>;
  declare actualizado_en: CreationOptional<Date>;

  /** Sin hash. Es lo único que sale al front. */
  publico() {
    return { id: this.id, correo: this.correo, nombre: this.nombre, rol: this.rol };
  }
}

Usuario.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    correo: { type: DataTypes.STRING(254), allowNull: false },
    hash: { type: DataTypes.STRING(255), allowNull: false },
    nombre: { type: DataTypes.STRING(160), allowNull: false },
    rol: { type: DataTypes.ENUM('admin'), allowNull: false, defaultValue: 'admin' },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    creado_en: DataTypes.DATE,
    actualizado_en: DataTypes.DATE,
  },
  { sequelize, tableName: 'usuarios', defaultScope: { attributes: { exclude: ['hash'] } }, scopes: { conHash: {} } },
);
