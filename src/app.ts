/* ------------------------------------------------------------------ *
 *  src/app.ts
 *  La aplicación Elysia sin escuchar puerto, para poder probarla en
 *  memoria con app.handle(new Request(...)).
 * ------------------------------------------------------------------ */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { config } from './config';
import { sequelize } from './db/sequelize';
import paquete from '../package.json';

export function crearApp() {
  return new Elysia()
    .use(
      cors({
        origin: config.ORIGENES_PERMITIDOS,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      }),
    )
    .use(
      openapi({
        path: '/docs',
        documentation: {
          info: { title: 'Eveline Dublan · API', version: paquete.version },
        },
      }),
    )
    .onError(({ code, error, set }) => {
      if (code === 'VALIDATION') {
        set.status = 400;
        return {
          error: 'Datos inválidos',
          codigo: 'validacion',
          detalles: error.all.map((e) => ('summary' in e ? e.summary : String(e))),
        };
      }
      if (code === 'NOT_FOUND') {
        set.status = 404;
        return { error: 'No encontrado', codigo: 'no_encontrado' };
      }
      console.error(error);
      set.status = 500;
      return {
        error: 'Error interno',
        codigo: 'interno',
        ...(config.ENTORNO !== 'produccion' ? { detalle: String(error) } : {}),
      };
    })
    .get(
      '/salud',
      async () => {
        let bd: 'ok' | 'sin_conexion' = 'ok';
        try {
          await sequelize.authenticate();
        } catch {
          bd = 'sin_conexion';
        }
        return { estado: 'ok', bd, version: paquete.version, entorno: config.ENTORNO };
      },
      { detail: { tags: ['Sistema'], summary: 'Estado del servicio y de la base de datos' } },
    );
}

export type App = ReturnType<typeof crearApp>;
