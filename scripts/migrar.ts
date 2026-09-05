/* ------------------------------------------------------------------ *
 *  scripts/migrar.ts
 *    bun scripts/migrar.ts up            aplica pendientes
 *    bun scripts/migrar.ts down          revierte la última
 *    bun scripts/migrar.ts pendientes    lista sin aplicar
 *    bun scripts/migrar.ts crear nombre  genera NNNN-nombre.ts
 * ------------------------------------------------------------------ */

import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { umzug } from '../src/db/migraciones/index';
import { sequelize } from '../src/db/sequelize';

const [accion = 'up', nombre] = process.argv.slice(2);
const carpeta = join(import.meta.dir, '../src/db/migraciones');

const PLANTILLA = `import type { ContextoMigracion } from './index';

export async function up({ context: q }: ContextoMigracion) {
  // await q.createTable(...)
}

export async function down({ context: q }: ContextoMigracion) {
  // await q.dropTable(...)
}
`;

try {
  switch (accion) {
    case 'up': {
      const hechas = await umzug.up();
      console.log(hechas.length ? `Aplicadas: ${hechas.map((m) => m.name).join(', ')}` : 'Nada pendiente.');
      break;
    }
    case 'down': {
      const revertidas = await umzug.down();
      console.log(revertidas.length ? `Revertida: ${revertidas.map((m) => m.name).join(', ')}` : 'Nada que revertir.');
      break;
    }
    case 'pendientes': {
      const p = await umzug.pending();
      console.log(p.length ? p.map((m) => m.name).join('\n') : 'Nada pendiente.');
      break;
    }
    case 'crear': {
      if (!nombre) throw new Error('Falta el nombre: bun scripts/migrar.ts crear nombre-en-kebab');
      const existentes = readdirSync(carpeta).filter((f) => /^\d{4}-/.test(f));
      const siguiente = String(existentes.length + 1).padStart(4, '0');
      const archivo = join(carpeta, `${siguiente}-${nombre}.ts`);
      writeFileSync(archivo, PLANTILLA);
      console.log(`Creada ${archivo}`);
      break;
    }
    default:
      throw new Error(`Acción desconocida: ${accion}`);
  }
} finally {
  await sequelize.close();
}
