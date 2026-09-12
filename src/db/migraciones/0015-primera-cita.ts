import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

/* ------------------------------------------------------------------ *
 *  Eveline distingue la primera cita de las subsecuentes: la primera se
 *  confirma con depósito y lleva indicaciones en el correo; las
 *  subsecuentes se pactan al final de la sesión y ya quedan confirmadas.
 *  Las citas anteriores a esta columna quedan como subsecuentes (false).
 * ------------------------------------------------------------------ */

export async function up({ context: q }: ContextoMigracion) {
  await q.addColumn('citas', 'primera_cita', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
}

export async function down({ context: q }: ContextoMigracion) {
  await q.removeColumn('citas', 'primera_cita');
}
