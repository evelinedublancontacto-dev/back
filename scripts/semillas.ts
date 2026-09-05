/* bun scripts/semillas.ts — idempotente: se puede correr las veces que haga falta. */
import { sequelize } from '../src/db/sequelize';
import { sembrarServicios } from '../src/db/semillas/servicios';
import { sembrarHorarios } from '../src/db/semillas/horarios';
import { sembrarPosts } from '../src/db/semillas/posts';

try {
  const s = await sembrarServicios();
  console.log(`servicios: ${s.creados} creados de ${s.total}`);
  const h = await sembrarHorarios();
  console.log(h.omitido ? 'horarios: ya había; omitido' : `horarios: ${h.creados} creados`);
  const p = await sembrarPosts();
  console.log(`posts: ${p.creados} creados de ${p.total}`);
} finally {
  await sequelize.close();
}
