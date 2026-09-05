/* ------------------------------------------------------------------ *
 *  src/db/migraciones/index.ts
 *  Migraciones con umzug. Cada archivo NNNN-nombre.ts de esta carpeta
 *  exporta up() y down() que reciben el QueryInterface de Sequelize.
 *  El estado se guarda en la tabla migraciones_sequelize.
 *
 *  Se resuelven con import() y no con require() para que corran igual
 *  bajo Bun en desarrollo y en producción sin paso de compilación.
 * ------------------------------------------------------------------ */

import { Umzug, SequelizeStorage } from 'umzug';
import type { QueryInterface } from 'sequelize';
import { sequelize } from '../sequelize';

export type ContextoMigracion = { context: QueryInterface };
export type Migracion = {
  up: (ctx: ContextoMigracion) => Promise<void>;
  down: (ctx: ContextoMigracion) => Promise<void>;
};

export const umzug = new Umzug<QueryInterface>({
  migrations: {
    glob: ['[0-9][0-9][0-9][0-9]-*.ts', { cwd: import.meta.dir }],
    resolve: ({ name, path, context }) => ({
      name,
      up: async () => {
        const m = (await import(path!)) as Migracion;
        await m.up({ context });
      },
      down: async () => {
        const m = (await import(path!)) as Migracion;
        await m.down({ context });
      },
    }),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'migraciones_sequelize' }),
  logger: {
    info: (m) => console.log(`[migraciones] ${m.event} ${m.name ?? ''}`.trim()),
    warn: (m) => console.warn('[migraciones]', m),
    error: (m) => console.error('[migraciones]', m),
    debug: () => {},
  },
});

export async function migrar() {
  const aplicadas = await umzug.up();
  if (aplicadas.length === 0) console.log('[migraciones] al día');
  return aplicadas;
}
