import { Elysia, t } from 'elysia';
import { Post } from '../../modelos';
import { ErrorHttp } from '../../errores';
import { Op } from 'sequelize';

export const rutasPosts = new Elysia({ prefix: '/posts', tags: ['Blog'] })
  .get(
    '/',
    async ({ query }) => {
      const pagina = query.pagina ?? 1;
      const por_pagina = Math.min(query.por_pagina ?? 50, 100);
      const { rows, count } = await Post.findAndCountAll({
        where: { publicado: true, ...(query.categoria ? { categoria: query.categoria } : {}) },
        order: [['publicado_en', 'DESC NULLS LAST'], ['creado_en', 'DESC']],
        limit: por_pagina,
        offset: (pagina - 1) * por_pagina,
      });
      return { posts: rows.map((p) => p.publico(false)), total: count, pagina, por_pagina };
    },
    {
      query: t.Object({ categoria: t.Optional(t.String()), pagina: t.Optional(t.Numeric({ minimum: 1 })), por_pagina: t.Optional(t.Numeric({ minimum: 1 })) }),
      detail: { summary: 'Posts publicados, sin contenido, más reciente primero' },
    },
  )
  .get(
    '/:slug',
    async ({ params }) => {
      const post = await Post.findOne({ where: { slug: params.slug, publicado: true } });
      if (!post) throw new ErrorHttp(404, 'post_no_encontrado', 'Ese artículo no existe.');
      const relacionados = await Post.findAll({
        where: { publicado: true, categoria: post.categoria, id: { [Op.ne]: post.id } },
        order: [['publicado_en', 'DESC NULLS LAST']],
        limit: 2,
      }).catch(() => [] as Post[]);
      return { post: post.publico(), relacionados: relacionados.map((p) => p.publico(false)) };
    },
    { detail: { summary: 'Un post publicado con dos relacionados de su categoría' } },
  );
