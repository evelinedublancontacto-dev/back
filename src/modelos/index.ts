/* Punto único de importación de modelos: aquí se declaran las asociaciones
   para que existan antes de cualquier consulta. */
import { Servicio } from './Servicio';
import { Horario } from './Horario';
import { Bloqueo } from './Bloqueo';
import { Cliente } from './Cliente';
import { Cita } from './Cita';

Cita.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Cita.belongsTo(Servicio, { foreignKey: 'servicio_id', as: 'servicio' });
Cliente.hasMany(Cita, { foreignKey: 'cliente_id', as: 'citas' });
Servicio.hasMany(Cita, { foreignKey: 'servicio_id', as: 'citas' });

export { Servicio, Horario, Bloqueo, Cliente, Cita };
export type { ReglasServicio } from './Servicio';
