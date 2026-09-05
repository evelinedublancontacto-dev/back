/* ------------------------------------------------------------------ *
 *  scripts/migrar-pocketbase.ts
 *  Exporta PocketBase e importa a Postgres. Se corre una vez por entorno;
 *  es re-ejecutable sin duplicar.
 *
 *    PB_URL=https://eveline-dublan.pockethost.io \
 *    PB_EMAIL=... PB_PASSWORD=... \
 *    bun scripts/migrar-pocketbase.ts [--solo-exportar]
 *
 *  1. Exporta servicios, horarios_disponibles, users, posts y citas a
 *     exportaciones/<coleccion>.json (respaldo, ignorado por git).
 *  2. Importa en ese orden. Citas: crea o reutiliza cliente por correo;
 *     "disponible" pasa a "pendiente"; si dos citas vivas chocan en fecha
 *     y hora, la segunda entra como cancelada y se lista en el reporte.
 *  3. Imprime conteos origen y destino por tabla.
 * ------------------------------------------------------------------ */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { UniqueConstraintError } from 'sequelize';
import { sequelize } from '../src/db/sequelize';
import { Cita, Cliente, Horario, Post, Servicio } from '../src/modelos';
import { aSlug } from '../src/servicios/slug';
import { ESTADOS_CITA, type EstadoCita } from '../src/modelos/Cita';

const PB_URL = (process.env.PB_URL ?? 'https://eveline-dublan.pockethost.io').replace(/\/$/, '');
const PB_EMAIL = process.env.PB_EMAIL;
const PB_PASSWORD = process.env.PB_PASSWORD;
const soloExportar = process.argv.includes('--solo-exportar');

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Faltan PB_EMAIL y PB_PASSWORD (superusuario de PocketBase).');
  process.exit(1);
}

type Registro = Record<string, unknown> & { id: string; created?: string };

/* ------------------------------------------------------------ PocketBase */
async function autenticarPB(): Promise<string> {
  /* PocketBase >= 0.23 usa _superusers; versiones previas, /api/admins. */
  for (const ruta of ['/api/collections/_superusers/auth-with-password', '/api/admins/auth-with-password']) {
    const r = await fetch(PB_URL + ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
    });
    if (r.ok) return ((await r.json()) as { token: string }).token;
    if (r.status !== 404) throw new Error(`PocketBase ${ruta}: ${r.status} ${await r.text()}`);
  }
  throw new Error('No se encontró el endpoint de autenticación de superusuario.');
}

async function listarTodo(token: string, coleccion: string, expand = ''): Promise<Registro[]> {
  const items: Registro[] = [];
  for (let pagina = 1; ; pagina++) {
    const url = `${PB_URL}/api/collections/${coleccion}/records?perPage=500&page=${pagina}${expand ? `&expand=${expand}` : ''}`;
    const r = await fetch(url, { headers: { Authorization: token } });
    if (r.status === 404) {
      console.warn(`  (la colección ${coleccion} no existe; se omite)`);
      return [];
    }
    if (!r.ok) throw new Error(`PocketBase ${coleccion}: ${r.status} ${await r.text()}`);
    const d = (await r.json()) as { items: Registro[]; totalPages: number };
    items.push(...d.items);
    if (pagina >= d.totalPages) break;
  }
  return items;
}

const s = (v: unknown) => (v === undefined || v === null ? '' : String(v)).trim();
const n = (v: unknown) => Number(v) || 0;

/* -------------------------------------------------------------- importar */
const reporte: string[] = [];
const conteos: Array<[string, number, number]> = [];

async function importarServicios(pb: Registro[]) {
  const porIdPB = new Map<string, string>(); // id PocketBase → slug nuestro
  let creados = 0;
  for (const r of pb) {
    const slug = aSlug(s(r.titulo) || s(r.title) || r.id);
    porIdPB.set(r.id, slug);
    const [, creado] = await Servicio.findOrCreate({
      where: { id: slug },
      defaults: {
        id: slug,
        titulo: s(r.titulo) || s(r.title) || slug,
        descripcion: s(r.descripcion) || s(r.description),
        duracion_min: n(r.duracion) || n(r.duration) || 60,
        precio: n(r.precio) || n(r.price),
        activo: r.activo !== false,
        orden: 100,
        reglas: {},
      },
    });
    if (creado) creados++;
  }
  conteos.push(['servicios', pb.length, await Servicio.count()]);
  reporte.push(`servicios: ${creados} creados desde PocketBase`);
  return porIdPB;
}

async function importarHorarios(pb: Registro[]) {
  let creados = 0;
  for (const r of pb) {
    const datos = { dia_semana: n(r.dia_semana), hora_inicio: s(r.hora_inicio).slice(0, 5), hora_fin: s(r.hora_fin).slice(0, 5), activo: r.activo !== false };
    if (!datos.hora_inicio || !datos.hora_fin) continue;
    const [, creado] = await Horario.findOrCreate({ where: { dia_semana: datos.dia_semana, hora_inicio: datos.hora_inicio, hora_fin: datos.hora_fin }, defaults: datos });
    if (creado) creados++;
  }
  conteos.push(['horarios', pb.length, await Horario.count()]);
  reporte.push(`horarios: ${creados} creados`);
}

async function importarUsuariosComoClientes(pb: Registro[]) {
  let creados = 0;
  for (const r of pb) {
    const correo = s(r.email).toLowerCase();
    if (!correo) continue;
    const [, creado] = await Cliente.findOrCreate({
      where: { correo },
      defaults: { nombre: s(r.nombre) || s(r.name) || correo.split('@')[0]!, correo, telefono: s(r.telefono) || s(r.phone) },
    });
    if (creado) creados++;
  }
  reporte.push(`users → clientes: ${creados} creados de ${pb.length} (los administradores se crean con semillas:admin)`);
}

async function importarPosts(pb: Registro[]) {
  let creados = 0;
  let actualizados = 0;
  for (const r of pb) {
    const slug = aSlug(s(r.slug) || s(r.title), 200);
    if (!slug) continue;
    const datos = {
      titulo: s(r.title) || slug,
      slug,
      extracto: s(r.excerpt),
      contenido: s(r.content),
      imagen_url: s(r.image),
      categoria: s(r.category) || 'sanacion-energetica',
      publicado: r.published !== false,
      publicado_en: r.created ? new Date(r.created) : new Date(),
      origen_id: `pb-${r.id}`,
    };
    const existente = await Post.findOne({ where: { slug } });
    if (existente) {
      /* PocketBase gana sobre la semilla de WordPress: es lo editado más recientemente. */
      await existente.update(datos);
      actualizados++;
    } else {
      await Post.create(datos);
      creados++;
    }
  }
  conteos.push(['posts', pb.length, await Post.count()]);
  reporte.push(`posts: ${creados} creados, ${actualizados} actualizados sobre la semilla`);
}

function mapearEstado(v: unknown): EstadoCita {
  const e = s(v);
  if (e === 'disponible') return 'pendiente';
  return (ESTADOS_CITA as readonly string[]).includes(e) ? (e as EstadoCita) : 'pendiente';
}

async function importarCitas(pb: Registro[], servicioPorIdPB: Map<string, string>) {
  let creadas = 0;
  let omitidas = 0;
  let sinServicio = 0;
  const chocaron: string[] = [];
  const idsServicio = new Set((await Servicio.findAll({ attributes: ['id'] })).map((x) => x.id));

  for (const r of pb) {
    const correo = s(r.email).toLowerCase();
    const fecha = s(r.fecha).slice(0, 10);
    const hora = s(r.hora).slice(0, 5);
    if (!correo || !fecha || !hora) {
      omitidas++;
      continue;
    }
    const [cliente] = await Cliente.findOrCreate({ where: { correo }, defaults: { nombre: s(r.nombre) || correo, correo, telefono: s(r.telefono) } });

    let servicioId = s(r.servicio);
    if (servicioPorIdPB.has(servicioId)) servicioId = servicioPorIdPB.get(servicioId)!;
    if (!idsServicio.has(servicioId)) {
      sinServicio++;
      const [ph] = await Servicio.findOrCreate({
        where: { id: 'sin-clasificar' },
        defaults: { id: 'sin-clasificar', titulo: 'Sin clasificar (migración)', descripcion: '', duracion_min: 60, precio: 0, activo: false, orden: 999, reglas: {} },
      });
      servicioId = ph.id;
      idsServicio.add(ph.id);
    }

    const yaExiste = await Cita.findOne({ where: { cliente_id: cliente.id, fecha, hora, servicio_id: servicioId } });
    if (yaExiste) {
      omitidas++;
      continue;
    }
    const datos = { cliente_id: cliente.id, servicio_id: servicioId, fecha, hora, estado: mapearEstado(r.estado), notas: s(r.notas), origen: 'pocketbase' };
    try {
      await Cita.create(datos);
      creadas++;
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        await Cita.create({ ...datos, estado: 'cancelada', notas: `${datos.notas}\n[migración] chocaba con otra cita viva en ${fecha} ${hora}; importada como cancelada`.trim() });
        chocaron.push(`${fecha} ${hora} ${correo}`);
        creadas++;
      } else throw e;
    }
  }
  conteos.push(['citas', pb.length, await Cita.count()]);
  reporte.push(`citas: ${creadas} creadas, ${omitidas} omitidas (repetidas o incompletas), ${sinServicio} con servicio desconocido → "sin-clasificar"`);
  if (chocaron.length) reporte.push(`citas que chocaban y entraron canceladas:\n    ${chocaron.join('\n    ')}`);
}

/* ------------------------------------------------------------------ main */
try {
  console.log(`Autenticando en ${PB_URL}…`);
  const token = await autenticarPB();

  const carpeta = join(import.meta.dir, '../exportaciones');
  mkdirSync(carpeta, { recursive: true });
  const exportado: Record<string, Registro[]> = {};
  for (const col of ['servicios', 'horarios_disponibles', 'users', 'posts', 'citas']) {
    exportado[col] = await listarTodo(token, col);
    writeFileSync(join(carpeta, `${col}.json`), JSON.stringify(exportado[col], null, 2));
    console.log(`  ${col}: ${exportado[col].length} registros → exportaciones/${col}.json`);
  }
  if (soloExportar) {
    console.log('Solo exportación; no se importó nada.');
    process.exit(0);
  }

  const servicioPorIdPB = await importarServicios(exportado.servicios!);
  await importarHorarios(exportado.horarios_disponibles!);
  await importarUsuariosComoClientes(exportado.users!);
  await importarPosts(exportado.posts!);
  await importarCitas(exportado.citas!, servicioPorIdPB);

  console.log('\nReporte:');
  for (const linea of reporte) console.log('  ' + linea);
  console.log('\nConteos (origen PocketBase → destino Postgres):');
  for (const [tabla, o, d] of conteos) console.log(`  ${tabla.padEnd(10)} ${String(o).padStart(5)} → ${String(d).padStart(5)}`);
} finally {
  await sequelize.close();
}
