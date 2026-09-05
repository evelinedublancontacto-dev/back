/* ------------------------------------------------------------------ *
 *  src/modulos/auth/servicio.ts
 *  Contraseñas con argon2id (Bun.password). Sesiones con token aleatorio
 *  de 32 bytes: al navegador va el token; a la base, su HMAC-SHA256 con
 *  COOKIE_SECRETO (o SHA-256 a secas si no hay secreto, en desarrollo).
 * ------------------------------------------------------------------ */

import { Op } from 'sequelize';
import { config } from '../../config';
import { Sesion, Usuario } from '../../modelos';
import { ErrorHttp } from '../../errores';

export const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000;
export const NOMBRE_COOKIE = 'sesion';

export function hashearToken(token: string): string {
  const h = config.COOKIE_SECRETO
    ? new Bun.CryptoHasher('sha256', config.COOKIE_SECRETO)
    : new Bun.CryptoHasher('sha256');
  return h.update(token).digest('hex');
}

export async function hashearContrasena(texto: string) {
  return Bun.password.hash(texto, { algorithm: 'argon2id' });
}

export async function crearUsuarioAdmin(correo: string, contrasena: string, nombre: string) {
  if (contrasena.length < 10) throw new ErrorHttp(400, 'contrasena_corta', 'La contraseña necesita al menos 10 caracteres.');
  return Usuario.create({ correo: correo.trim().toLowerCase(), hash: await hashearContrasena(contrasena), nombre, rol: 'admin' });
}

export async function autenticar(correo: string, contrasena: string, meta: { ip: string; userAgent: string }) {
  const usuario = await Usuario.scope('conHash').findOne({ where: { correo: correo.trim().toLowerCase() } });
  /* Mismo mensaje y tiempo parecido exista o no el correo. */
  const valida = usuario ? await Bun.password.verify(contrasena, usuario.hash) : await Bun.password.verify(contrasena, HASH_SEÑUELO).then(() => false);
  if (!usuario || !valida || !usuario.activo) {
    throw new ErrorHttp(401, 'credenciales_invalidas', 'Correo o contraseña incorrectos.');
  }

  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
  await Sesion.create({
    usuario_id: usuario.id,
    token_hash: hashearToken(token),
    expira_en: new Date(Date.now() + DURACION_SESION_MS),
    ip: meta.ip,
    user_agent: meta.userAgent.slice(0, 400),
  });
  return { usuario, token };
}

/* Hash de una contraseña que nadie tiene, para que verificar contra un
   correo inexistente tarde lo mismo que contra uno real. */
const HASH_SEÑUELO = await Bun.password.hash('señuelo-no-es-una-contraseña-real', { algorithm: 'argon2id' });

/** Devuelve el usuario de un token vigente, o null. Renueva ultimo_uso. */
export async function usuarioPorToken(token: string | undefined): Promise<{ usuario: Usuario; sesion: Sesion } | null> {
  if (!token) return null;
  const sesion = await Sesion.findOne({
    where: { token_hash: hashearToken(token), expira_en: { [Op.gt]: new Date() } },
    include: [{ model: Usuario, as: 'usuario' }],
  });
  if (!sesion?.usuario || !sesion.usuario.activo) return null;
  if (Date.now() - sesion.ultimo_uso.getTime() > 5 * 60 * 1000) {
    void sesion.update({ ultimo_uso: new Date() });
  }
  return { usuario: sesion.usuario, sesion };
}

export async function cerrarSesion(token: string | undefined) {
  if (!token) return;
  await Sesion.destroy({ where: { token_hash: hashearToken(token) } });
}

export async function purgarSesionesVencidas() {
  return Sesion.destroy({ where: { expira_en: { [Op.lt]: new Date() } } });
}
