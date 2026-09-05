import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { crearApp } from '../src/app';
import { migrar } from '../src/db/migraciones/index';
import { sembrarPosts } from '../src/db/semillas/posts';
import { Post, Sesion, Usuario } from '../src/modelos';
import { crearUsuarioAdmin } from '../src/modulos/auth/servicio';

const app = crearApp();
const ADMIN = { correo: 'admin.posts@ejemplo.test', contrasena: 'otra-contraseña-larga-456' };
let cookie = '';

const json = (metodo: string, ruta: string, cuerpo?: unknown) =>
  app.handle(new Request(`http://localhost${ruta}`, { method: metodo, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) }));

async function limpiar() {
  await Post.destroy({ where: { slug: ['articulo-de-prueba', 'articulo-de-prueba-2'] } });
  const u = await Usuario.findOne({ where: { correo: ADMIN.correo } });
  if (u) {
    await Sesion.destroy({ where: { usuario_id: u.id } });
    await u.destroy();
  }
}

beforeAll(async () => {
  await migrar();
  await sembrarPosts();
  await limpiar();
  await crearUsuarioAdmin(ADMIN.correo, ADMIN.contrasena, 'Admin posts');
  const res = await json('POST', '/v1/auth/entrar', ADMIN);
  cookie = (res.headers.get('set-cookie') ?? '').split(';')[0]!;
});
afterAll(limpiar);

describe('blog público', () => {
  it('la semilla deja los 16 artículos de WordPress publicados', async () => {
    const res = await app.handle(new Request('http://localhost/v1/posts?por_pagina=100'));
    const r = (await res.json()) as { posts: Array<{ slug: string; content?: string }>; total: number };
    expect(r.total).toBeGreaterThanOrEqual(16);
    expect(r.posts[0]).not.toHaveProperty('content'); // el listado va sin contenido
  });
  it('sirve un artículo por slug con su contenido y relacionados', async () => {
    const lista = (await (await app.handle(new Request('http://localhost/v1/posts'))).json()) as { posts: Array<{ slug: string }> };
    const res = await app.handle(new Request(`http://localhost/v1/posts/${lista.posts[0]!.slug}`));
    expect(res.status).toBe(200);
    const r = (await res.json()) as { post: { content: string; title: string }; relacionados: unknown[] };
    expect(r.post.content.length).toBeGreaterThan(50);
    expect(r.relacionados.length).toBeLessThanOrEqual(2);
  });
  it('un slug inexistente da 404', async () => {
    expect((await app.handle(new Request('http://localhost/v1/posts/no-existe'))).status).toBe(404);
  });
});

describe('blog admin', () => {
  let id = '';
  it('crea un borrador derivando el slug del título', async () => {
    const res = await json('POST', '/v1/admin/posts', { title: 'Artículo de Prueba', content: '<p>Hola</p>' });
    expect(res.status).toBe(201);
    const { post } = (await res.json()) as { post: { id: string; slug: string; published: boolean; date?: string } };
    expect(post.slug).toBe('articulo-de-prueba');
    expect(post.published).toBe(false);
    expect(post.date).toBeUndefined();
    id = post.id;
  });
  it('un borrador no aparece en el blog público', async () => {
    expect((await app.handle(new Request('http://localhost/v1/posts/articulo-de-prueba'))).status).toBe(404);
  });
  it('al publicarlo fija la fecha y ya se sirve', async () => {
    const res = await json('PATCH', `/v1/admin/posts/${id}`, { published: true });
    const { post } = (await res.json()) as { post: { date?: string } };
    expect(post.date).toBeDefined();
    expect((await app.handle(new Request('http://localhost/v1/posts/articulo-de-prueba'))).status).toBe(200);
  });
  it('no permite dos artículos con el mismo slug', async () => {
    const res = await json('POST', '/v1/admin/posts', { title: 'Otro', slug: 'articulo-de-prueba' });
    expect(res.status).toBe(409);
  });
  it('lo borra', async () => {
    expect(await (await json('DELETE', `/v1/admin/posts/${id}`)).json()).toEqual({ ok: true });
  });
});
