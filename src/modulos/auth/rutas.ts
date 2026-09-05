import { Elysia, t } from 'elysia';
import { config } from '../../config';
import { autenticar, cerrarSesion, DURACION_SESION_MS, NOMBRE_COOKIE } from './servicio';
import { conSesion } from '../../middleware/sesion';
import { crearLimitador, obtenerIP } from '../../middleware/rateLimit';
import { registrar } from '../../servicios/bitacora';

const limitarLogin = crearLimitador('inicio de sesión', 5, 15 * 60 * 1000);

export const rutasAuth = new Elysia({ prefix: '/auth', tags: ['Auth'] })
  .use(conSesion)
  .post(
    '/entrar',
    async ({ body, cookie, request, server }) => {
      const ip = obtenerIP(request, server);
      limitarLogin(`${ip}|${body.correo.toLowerCase()}`);
      const { usuario, token } = await autenticar(body.correo, body.contrasena, { ip, userAgent: request.headers.get('user-agent') ?? '' });
      cookie[NOMBRE_COOKIE]!.set({
        value: token,
        httpOnly: true,
        secure: config.ENTORNO === 'produccion',
        sameSite: 'lax',
        path: '/',
        maxAge: DURACION_SESION_MS / 1000,
        ...(config.COOKIE_DOMINIO ? { domain: config.COOKIE_DOMINIO } : {}),
      });
      void registrar({ usuario, ip }, 'entrar', 'usuario', usuario.id);
      return { usuario: usuario.publico() };
    },
    {
      body: t.Object({ correo: t.String({ format: 'email' }), contrasena: t.String({ minLength: 1, maxLength: 200 }) }),
      detail: { summary: 'Iniciar sesión; deja cookie httpOnly' },
    },
  )
  .post(
    '/salir',
    async ({ cookie, usuario, actor, tokenSesion }) => {
      await cerrarSesion(tokenSesion);
      cookie[NOMBRE_COOKIE]?.remove(config.COOKIE_DOMINIO ? { domain: config.COOKIE_DOMINIO, path: '/' } : { path: '/' });
      if (usuario) void registrar(actor, 'salir', 'usuario', usuario.id);
      return { ok: true };
    },
    { detail: { summary: 'Cerrar la sesión actual' } },
  )
  .get('/yo', ({ usuario }) => ({ usuario: usuario ? usuario.publico() : null }), {
    detail: { summary: 'Usuario de la sesión, o null' },
  });
