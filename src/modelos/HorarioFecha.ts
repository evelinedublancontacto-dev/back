import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../db/sequelize';
import { MODALIDADES, type Modalidad } from './Horario';

/** Horario extraordinario de una fecha concreta: el puente en que Eveline
 *  atiende todo el día, el martes que trabaja en la mañana en vez de la tarde.
 *  Cuando una fecha tiene ventanas propias, estas sustituyen a las de la
 *  semana; los bloqueos se siguen aplicando encima. */
export class HorarioFecha extends Model<InferAttributes<HorarioFecha>, InferCreationAttributes<HorarioFecha>> {
  declare id: CreationOptional<string>;
  declare fecha: string; // "2026-09-14"
  declare hora_inicio: string; // "09:00"
  declare hora_fin: string; // "14:00"
  declare modalidad: CreationOptional<Modalidad>;
  declare nota: CreationOptional<string>;
  declare creado_en: CreationOptional<Date>;
  declare actualizado_en: CreationOptional<Date>;
}

HorarioFecha.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    hora_inicio: { type: DataTypes.TIME, allowNull: false },
    hora_fin: { type: DataTypes.TIME, allowNull: false },
    modalidad: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'en_linea' },
    nota: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    creado_en: DataTypes.DATE,
    actualizado_en: DataTypes.DATE,
  },
  { sequelize, tableName: 'horarios_fecha' },
);

export { MODALIDADES };
