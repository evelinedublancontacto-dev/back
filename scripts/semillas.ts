/* bun scripts/semillas.ts — idempotente: se puede correr las veces que haga falta. */
import { sequelize } from '../src/db/sequelize';
import { sembrarServicios } from '../src/db/semillas/servicios';
import { sembrarHorarios } from '../src/db/semillas/horarios';

try {
  const s = await sembrarServicios();
  console.log(`servicios: ${s.creados} creados de ${s.total}`);
  const h = await sembrarHorarios();
  console.log(h.omitido ? 'horarios: ya había; omitido' : `horarios: ${h.creados} creados`);
} finally {
  await sequelize.close();
}
