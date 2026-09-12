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
    /* Dominio padre para compartir la cookie entre api. y www. (".evelinedublan.com").
       Sin valor, la cookie es solo del host de la API. */
    COOKIE_DOMINIO: z.string().optional(),
    /* lax cuando front y back comparten sitio (api. y www. del mismo dominio);
       none cuando viven en dominios distintos, como los *.up.railway.app.
       Con none la cookie sale siempre con Secure. */
    COOKIE_SAMESITE: z.enum(['lax', 'none']).default('lax'),
    RESEND_API_KEY: z.string().optional(),
    CORREO_REMITENTE: z.string().optional(),
    CORREO_ADMIN: z.email().optional(),
    /* La primera cita se confirma con depósito hasta N días antes de la fecha. */
    DIAS_LIMITE_DEPOSITO: z.coerce.number().int().min(0).default(2),
    MIGRAR_AL_ARRANCAR: z.enum(['si', 'no']).default('si'),
    /* Semillas idempotentes (servicios, horarios, posts) al arrancar. */
    SEMILLAS_AL_ARRANCAR: z.enum(['si', 'no']).default('no'),
    /* Primer administrador: se crea al arrancar solo si ese correo no existe.
       Pensado para el primer despliegue; después conviene quitar la contraseña
       de las variables. */
    ADMIN_INICIAL_CORREO: z.email().optional(),
    ADMIN_INICIAL_CONTRASENA: z.string().min(10).optional(),
    SQL_LOG: z.enum(['si', 'no']).default('no'),
  })
  .superRefine((v, ctx) => {
    if (v.ENTORNO !== 'produccion') return;
    /* Solo el secreto de cookie es indispensable para arrancar: sin correo
       el sitio funciona, solo deja de avisar (y lo dice en el log). */
    if (!v.COOKIE_SECRETO) {
      ctx.addIssue({ code: 'custom', path: ['COOKIE_SECRETO'], message: 'COOKIE_SECRETO es obligatoria en producción' });
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

{
  const faltantes = (['RESEND_API_KEY', 'CORREO_REMITENTE', 'CORREO_ADMIN'] as const).filter((k) => !config[k]);
  if (faltantes.length) {
    console.warn(`Aviso: sin ${faltantes.join(', ')}. Los correos de confirmación no saldrán hasta configurarlas.`);
  }
  if (config.ENTORNO === 'desarrollo' && !config.COOKIE_SECRETO) {
    console.warn('Aviso: sin COOKIE_SECRETO; los tokens de sesión se hashean sin secreto.');
  }
}
