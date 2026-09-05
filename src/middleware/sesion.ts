/* ------------------------------------------------------------------ *
 *  src/middleware/sesion.ts
 *  conSesion: agrega `usuario` (o null), `actor` y `tokenSesion` al
 *  contexto leyendo la cookie. soloAdmin: lo mismo y además corta con
 *  401/403.
 *
 *  Dos cuidados de Elysia:
 *  - El alcance 'scoped' sube exactamente un nivel: por eso el guardia no
 *    reutiliza conSesion con .use(), sino la misma función.
 *  - Sin `name`: los plugins con nombre se registran una sola vez por
 *    aplicación, y aquí cada router de admin necesita su propio guardia.
 * ------------------------------------------------------------------ */

import { Elysia, type Context } from 'elysia';
import { ErrorHttp } from '../errores';
import { NOMBRE_COOKIE, usuarioPorToken } from '../modulos/auth/servicio';
import { obtenerIP } from './rateLimit';
import type { Actor } from '../servicios/bitacora';

async function derivarSesion({ cookie, request, server }: Pick<Context, 'cookie' | 'request' | 'server'>) {
  const token = cookie[NOMBRE_COOKIE]?.value as string | undefined;
  const encontrado = await usuarioPorToken(token);
  const usuario = encontrado?.usuario ?? null;
  const actor: Actor = { usuario, ip: obtenerIP(request, server) };
  return { usuario, actor, tokenSesion: token };
}

export const conSesion = new Elysia().derive({ as: 'scoped' }, derivarSesion);

/* El corte va dentro del derive, no en beforeHandle: derive corre antes de
   validar el cuerpo, así un anónimo recibe 401 y no un 400 que le
   describa el esquema. */
export const soloAdmin = new Elysia().derive({ as: 'scoped' }, async (ctx) => {
  const sesion = await derivarSesion(ctx);
  if (!sesion.usuario) throw new ErrorHttp(401, 'sin_sesion', 'Inicie sesión para continuar.');
  if (sesion.usuario.rol !== 'admin') throw new ErrorHttp(403, 'sin_permiso', 'No tiene permiso para esta acción.');
  return sesion;
});
