import { Post } from '../../modelos';
import datos from './datos/posts-wordpress.json';

type PostWP = { id: string; title: string; slug: string; excerpt: string; content: string; image: string; category: string; published: boolean; date: string };

/* Los artículos que hoy vive el front en un JSON exportado de WordPress.
   Inserta los que faltan por slug; no pisa ediciones hechas en el admin. */
export async function sembrarPosts() {
  let creados = 0;
  for (const p of datos as PostWP[]) {
    const [, creado] = await Post.findOrCreate({
      where: { slug: p.slug },
      defaults: {
        titulo: p.title,
        slug: p.slug,
        extracto: p.excerpt,
        contenido: p.content,
        imagen_url: p.image ?? '',
        categoria: p.category || 'sanacion-energetica',
        publicado: p.published !== false,
        publicado_en: p.date ? new Date(p.date) : new Date(),
        origen_id: p.id,
      },
    });
    if (creado) creados++;
  }
  return { total: (datos as PostWP[]).length, creados };
}
