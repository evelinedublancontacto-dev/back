/* Punto único de importación de modelos: aquí se declaran las asociaciones
   para que existan antes de cualquier consulta. */
import { Servicio } from './Servicio';
import { Horario } from './Horario';
import { Bloqueo } from './Bloqueo';
import { Cliente } from './Cliente';
import { Cita } from './Cita';
import { Usuario } from './Usuario';
import { Sesion } from './Sesion';
import { Bitacora } from './Bitacora';
import { Post } from './Post';

Cita.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Cita.belongsTo(Servicio, { foreignKey: 'servicio_id', as: 'servicio' });
Cliente.hasMany(Cita, { foreignKey: 'cliente_id', as: 'citas' });
Servicio.hasMany(Cita, { foreignKey: 'servicio_id', as: 'citas' });
Sesion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(Sesion, { foreignKey: 'usuario_id', as: 'sesiones' });

export { Servicio, Horario, Bloqueo, Cliente, Cita, Usuario, Sesion, Bitacora, Post };
export type { ReglasServicio } from './Servicio';
