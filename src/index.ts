import { config } from './config';
import { crearApp } from './app';
import { migrar } from './db/migraciones/index';
import { sembrarServicios } from './db/semillas/servicios';
import { sembrarHorarios } from './db/semillas/horarios';
import { sembrarPosts } from './db/semillas/posts';
import { Usuario } from './modelos';
import { crearUsuarioAdmin } from './modulos/auth/servicio';

if (config.MIGRAR_AL_ARRANCAR === 'si') {
  await migrar();
}

if (config.SEMILLAS_AL_ARRANCAR === 'si') {
  const s = await sembrarServicios();
  const h = await sembrarHorarios();
  const p = await sembrarPosts();
  console.log(`[semillas] servicios +${s.creados}, horarios +${h.creados}, posts +${p.creados}`);
}

if (config.ADMIN_INICIAL_CORREO && config.ADMIN_INICIAL_CONTRASENA) {
  const correo = config.ADMIN_INICIAL_CORREO.toLowerCase();
  if (await Usuario.findOne({ where: { correo } })) {
    console.log(`[admin inicial] ${correo} ya existe; no se toca. Puede quitar ADMIN_INICIAL_* de las variables.`);
  } else {
    await crearUsuarioAdmin(correo, config.ADMIN_INICIAL_CONTRASENA, 'Eveline');
    console.log(`[admin inicial] creado ${correo}`);
  }
}

const app = crearApp().listen(config.PUERTO);

console.log(`API escuchando en http://localhost:${app.server?.port} · ${config.ENTORNO} · docs en /docs`);
