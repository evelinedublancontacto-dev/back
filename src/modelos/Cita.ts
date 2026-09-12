import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../db/sequelize';
import type { Cliente } from './Cliente';
import type { Servicio } from './Servicio';

export const ESTADOS_CITA = ['pendiente', 'confirmada', 'cancelada', 'completada'] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number];

/* Estados que ocupan el horario. Debe coincidir con el índice parcial
   citas_horario_vivo_unico de la migración 0006. */
export const ESTADOS_VIVOS: readonly EstadoCita[] = ['pendiente', 'confirmada'];

export class Cita extends Model<InferAttributes<Cita>, InferCreationAttributes<Cita>> {
  declare id: CreationOptional<string>;
  declare cliente_id: ForeignKey<string>;
  declare servicio_id: ForeignKey<string>;
  declare fecha: string;
  declare hora: string;
  declare estado: CreationOptional<EstadoCita>;
  declare notas: CreationOptional<string>;
  /** Primera cita con Eveline (se confirma con depósito) o subsecuente. */
  declare primera_cita: CreationOptional<boolean>;
  declare origen: CreationOptional<string>;
  declare creado_en: CreationOptional<Date>;
  declare actualizado_en: CreationOptional<Date>;

  declare cliente?: NonAttribute<Cliente>;
  declare servicio?: NonAttribute<Servicio>;

  /** Forma plana que hoy consume el front (nombre, email, teléfono al nivel raíz). */
  plana() {
    return {
      id: this.id,
      nombre: this.cliente?.nombre ?? '',
      email: this.cliente?.correo ?? '',
      telefono: this.cliente?.telefono ?? '',
      servicio: this.servicio_id,
      servicioNombre: this.servicio?.titulo,
      fecha: this.fecha,
      hora: this.hora,
      estado: this.estado,
      notas: this.notas,
      primeraCita: this.primera_cita,
      origen: this.origen,
      created: this.creado_en,
    };
  }
}

Cita.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    cliente_id: { type: DataTypes.UUID, allowNull: false },
    servicio_id: { type: DataTypes.STRING(80), allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    hora: { type: DataTypes.TIME, allowNull: false },
    estado: { type: DataTypes.ENUM(...ESTADOS_CITA), allowNull: false, defaultValue: 'pendiente' },
    notas: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    primera_cita: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    origen: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'web' },
    creado_en: DataTypes.DATE,
    actualizado_en: DataTypes.DATE,
  },
  { sequelize, tableName: 'citas' },
);
