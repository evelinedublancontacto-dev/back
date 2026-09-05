/* ------------------------------------------------------------------ *
 *  src/middleware/rateLimit.ts
 *  Límite de peticiones por IP en memoria del proceso. Frena scripts
 *  sueltos; no sustituye a un WAF. Se reinicia con cada despliegue y no
 *  se comparte entre instancias. En pruebas está apagado.
 * ------------------------------------------------------------------ */

import type { Server } from 'bun';
import { config } from '../config';
import { ErrorHttp } from '../errores';

export function obtenerIP(request: Request, server: Server<unknown> | null): string {
  const reenviada = request.headers.get('x-forwarded-for');
  if (reenviada) return reenviada.split(',')[0]!.trim();
  return server?.requestIP(request)?.address ?? 'local';
}

export function crearLimitador(nombre: string, limite: number, ventanaMs: number) {
  const golpes = new Map<string, number[]>();

  return function verificar(clave: string) {
    if (config.ENTORNO === 'prueba') return;
    const ahora = Date.now();
    const previos = (golpes.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
    previos.push(ahora);
    golpes.set(clave, previos);
    if (golpes.size > 10_000) golpes.clear();
    if (previos.length > limite) {
      throw new ErrorHttp(429, 'demasiadas_solicitudes', `Demasiadas solicitudes de ${nombre}. Intente más tarde.`);
    }
  };
}
