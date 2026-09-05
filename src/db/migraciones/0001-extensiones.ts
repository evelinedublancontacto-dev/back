import type { ContextoMigracion } from './index';

/* pgcrypto da gen_random_uuid() para las llaves primarias. */
export async function up({ context: q }: ContextoMigracion) {
  await q.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
}

export async function down({ context: q }: ContextoMigracion) {
  await q.sequelize.query('DROP EXTENSION IF EXISTS pgcrypto;');
}
