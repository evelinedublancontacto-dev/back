import { Elysia, t } from 'elysia';
import { Op, UniqueConstraintError } from 'sequelize';
import { Post } from '../../modelos';
import { soloAdmin } from '../../middleware/sesion';
import { ErrorHttp } from '../../errores';
import { registrar } from '../../servicios/bitacora';
import { aSlug } from '../../servicios/slug';

async function cargar(id: string) {
  const p = await Post.findByPk(id);
  if (!p) throw new ErrorHttp(404, 'post_no_encontrado', 'Ese artículo no existe.');
  return p;
}

function slugDuplicado(e: unknown): never {
  if (e instanceof UniqueConstraintError) throw new ErrorHttp(409, 'slug_duplicado', 'Ya hay un artículo con ese slug.');
  throw e;
}

const campos = {
  title: t.String({ minLength: 2, maxLength: 300 }),
  slug: t.String({ minLength: 1, maxLength: 200 }),
  excerpt: t.String({ maxLength: 2000 }),
  content: t.String(),
  image: t.String({ maxLength: 1000 }),
  category: t.String({ maxLength: 80 }),
  published: t.Boolean(),
};

/* Del formato del front (inglés) al de la tabla (español). */
function aColumnas(b: Partial<{ title: string; slug: string; excerpt: string; content: string; image: string; category: string; published: boolean }>) {
  return {
    ...(b.title !== undefined ? { titulo: b.title } : {}),
    ...(b.slug !== undefined ? { slug: aSlug(b.slug, 200) } : {}),
    ...(b.excerpt !== undefined ? { extracto: b.excerpt } : {}),
    ...(b.content !== undefined ? { contenido: b.content } : {}),
    ...(b.image !== undefined ? { imagen_url: b.image } : {}),
    ...(b.category !== undefined ? { categoria: b.category } : {}),
    ...(b.published !== undefined ? { publicado: b.published } : {}),
  };
}

export const adminPosts = new Elysia({ prefix: '/posts', tags: ['Admin · Blog'] })
  .use(soloAdmin)
  .get(
    '/',
    async ({ query }) => {
      const q = query.q?.trim();
      const where = q ? { [Op.or]: [{ titulo: { [Op.iLike]: `%${q}%` } }, { slug: { [Op.iLike]: `%${q}%` } }] } : {};
      const posts = await Post.findAll({ where, order: [['creado_en', 'DESC']] });
      return { posts: posts.map((p) => p.publico(false)) };
    },
    { query: t.Object({ q: t.Optional(t.String()) }), detail: { summary: 'Todos los artículos, publicados o no' } },
  )
  .get('/:id', async ({ params }) => ({ post: (await cargar(params.id)).publico() }), { detail: { summary: 'Un artículo con contenido' } })
  .post(
    '/',
    async ({ body, actor, set }) => {
      const slug = aSlug(body.slug ?? body.title, 200);
      if (!slug) throw new ErrorHttp(400, 'slug_invalido', 'No se pudo derivar un slug del título.');
      const post = await Post.create({
        ...aColumnas({ ...body, slug }),
        titulo: body.title,
        slug,
        publicado_en: body.published ? new Date() : null,
      }).catch(slugDuplicado);
      void registrar(actor, 'crear', 'post', post.id, null, post.toJSON());
      set.status = 201;
      return { post: post.publico() };
    },
    {
      body: t.Object({ ...campos, slug: t.Optional(campos.slug), excerpt: t.Optional(campos.excerpt), content: t.Optional(campos.content), image: t.Optional(campos.image), category: t.Optional(campos.category), published: t.Optional(campos.published) }),
      detail: { summary: 'Crear artículo; el slug se deriva del título si no se manda' },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, actor }) => {
      const post = await cargar(params.id);
      const antes = post.toJSON();
      const cambios = aColumnas(body);
      /* La primera vez que se publica se fija la fecha; despublicar no la borra. */
      if (body.published === true && !post.publicado_en) Object.assign(cambios, { publicado_en: new Date() });
      await post.update(cambios).catch(slugDuplicado);
      void registrar(actor, 'actualizar', 'post', post.id, antes, post.toJSON());
      return { post: post.publico() };
    },
    { body: t.Partial(t.Object(campos)), detail: { summary: 'Editar artículo' } },
  )
  .delete(
    '/:id',
    async ({ params, actor }) => {
      const post = await cargar(params.id);
      const antes = post.toJSON();
      await post.destroy();
      void registrar(actor, 'borrar', 'post', params.id, antes, null);
      return { ok: true };
    },
    { detail: { summary: 'Borrar artículo' } },
  );
