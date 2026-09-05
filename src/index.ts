import { config } from './config';
import { crearApp } from './app';
import { migrar } from './db/migraciones/index';

if (config.MIGRAR_AL_ARRANCAR === 'si') {
  await migrar();
}

const app = crearApp().listen(config.PUERTO);

console.log(`API escuchando en http://localhost:${app.server?.port} · ${config.ENTORNO} · docs en /docs`);
