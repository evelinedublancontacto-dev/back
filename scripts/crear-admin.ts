/* bun scripts/crear-admin.ts correo contraseña ["Nombre"]
   Crea (o actualiza la contraseña de) un administrador. Sin contraseñas
   por defecto: la que se pase aquí es la única que existe. */
import { sequelize } from '../src/db/sequelize';
import { Usuario } from '../src/modelos';
import { crearUsuarioAdmin, hashearContrasena } from '../src/modulos/auth/servicio';

const [correo, contrasena, nombre = 'Eveline'] = process.argv.slice(2);
if (!correo || !contrasena) {
  console.error('Uso: bun scripts/crear-admin.ts correo contraseña ["Nombre"]');
  process.exit(1);
}

try {
  const existente = await Usuario.findOne({ where: { correo: correo.toLowerCase() } });
  if (existente) {
    await existente.update({ hash: await hashearContrasena(contrasena), activo: true });
    console.log(`Contraseña actualizada para ${existente.correo}`);
  } else {
    const u = await crearUsuarioAdmin(correo, contrasena, nombre);
    console.log(`Administrador creado: ${u.correo}`);
  }
} finally {
  await sequelize.close();
}
