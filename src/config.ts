/* ------------------------------------------------------------------ *
 *  src/config.ts
 *  Variables de entorno validadas al arrancar. Si en producción falta
 *  algo indispensable, el proceso muere aquí con un mensaje claro en
 *  vez de fallar a media petición.
 * ------------------------------------------------------------------ */

import { z } from 'zod';

const listaSeparadaPorComas = z
  .string()
  .default('http://localhost:3000')
  .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean));

const esquema = z
  .object({
    ENTORNO: z.enum(['desarrollo', 'prueba', 'produccion']).default('desarrollo'),
    PUERTO: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.url({ message: 'DATABASE_URL debe ser una URL postgres://' }),
    ORIGENES_PERMITIDOS: listaSeparadaPorComas,
    COOKIE_SECRETO: z.string().min(32, 'COOKIE_SECRETO necesita al menos 32 caracteres').optional(),
    RESEND_API_KEY: z.string().optional(),
    CORREO_REMITENTE: z.string().optional(),
    CORREO_ADMIN: z.email().optional(),
    MIGRAR_AL_ARRANCAR: z.enum(['si', 'no']).default('si'),
    SQL_LOG: z.enum(['si', 'no']).default('no'),
  })
  .superRefine((v, ctx) => {
    if (v.ENTORNO !== 'produccion') return;
    for (const clave of ['COOKIE_SECRETO', 'RESEND_API_KEY', 'CORREO_REMITENTE', 'CORREO_ADMIN'] as const) {
      if (!v[clave]) {
        ctx.addIssue({ code: 'custom', path: [clave], message: `${clave} es obligatoria en producción` });
      }
    }
  });

function vacioComoIndefinido(entorno: NodeJS.ProcessEnv) {
  return Object.fromEntries(
    Object.entries(entorno).map(([k, v]) => [k, v === '' ? undefined : v]),
  );
}

const resultado = esquema.safeParse(vacioComoIndefinido(process.env));

if (!resultado.success) {
  console.error('Configuración inválida:');
  for (const issue of resultado.error.issues) {
    console.error(`  ${issue.path.join('.') || '(raíz)'}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = resultado.data;
export type Config = typeof config;

if (config.ENTORNO === 'desarrollo') {
  const faltantes = (['COOKIE_SECRETO', 'RESEND_API_KEY', 'CORREO_ADMIN'] as const).filter((k) => !config[k]);
  if (faltantes.length) {
    console.warn(`Aviso: sin ${faltantes.join(', ')}. Sesiones y correos no funcionarán hasta configurarlas.`);
  }
}
