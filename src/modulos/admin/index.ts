import { Elysia } from 'elysia';
import { adminCitas } from './citas';
import { adminServicios, adminHorarios, adminHorariosFecha, adminBloqueos, adminClientes } from './catalogos';
import { adminBitacora } from './bitacora';
import { adminPosts } from './posts';

/* Cada router aplica soloAdmin por su cuenta: no hay ruta bajo /admin que
   pueda olvidarse el guardia. */
export const rutasAdmin = new Elysia({ prefix: '/admin' })
  .use(adminCitas)
  .use(adminServicios)
  .use(adminHorarios)
  .use(adminHorariosFecha)
  .use(adminBloqueos)
  .use(adminClientes)
  .use(adminBitacora)
  .use(adminPosts);
