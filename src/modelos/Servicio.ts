import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export type ReglasServicio = {
  /** Días de la semana permitidos (0 domingo … 6 sábado). Sin valor: todos. */
  dias_permitidos?: number[];
  /** Fija la modalidad del servicio; sin valor o 'ambas', manda la del día. */
  modalidad?: 'presencial' | 'en_linea' | 'a_distancia' | 'ambas';
  /** Texto que ve el visitante cuando elige un día no permitido. */
  mensaje_dias?: string;
};

export class Servicio extends Model<InferAttributes<Servicio>, InferCreationAttributes<Servicio>> {
  declare id: string;
  declare titulo: string;
  declare descripcion: CreationOptional<string>;
  declare duracion_min: number;
  declare precio: number;
  declare activo: CreationOptional<boolean>;
  declare orden: CreationOptional<number>;
  declare reglas: CreationOptional<ReglasServicio>;
  declare creado_en: CreationOptional<Date>;
  declare actualizado_en: CreationOptional<Date>;

  /** Forma que consume el front en la página de reservas. */
  publico() {
    return {
      id: this.id,
      titulo: this.titulo,
      descripcion: this.descripcion,
      duracion: this.duracion_min,
      precio: Number(this.precio),
      reglas: this.reglas,
    };
  }
}

Servicio.init(
  {
    id: { type: DataTypes.STRING(80), primaryKey: true },
    titulo: { type: DataTypes.STRING(160), allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    duracion_min: { type: DataTypes.INTEGER, allowNull: false },
    precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reglas: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    creado_en: DataTypes.DATE,
    actualizado_en: DataTypes.DATE,
  },
  { sequelize, tableName: 'servicios' },
);
