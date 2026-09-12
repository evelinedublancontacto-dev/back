import type { ContextoMigracion } from './index';

/* ------------------------------------------------------------------ *
 *  Imágenes del blog servidas desde el propio sitio (12 sep 2026).
 *
 *  Los 14 posts importados de WordPress guardaban imagen_url como una
 *  URL absoluta a https://www.evelinedublan.com/wp-content/uploads/...
 *  Al apuntar el dominio al sitio nuevo en Railway esas rutas dejaron
 *  de existir y el blog se quedó sin imágenes.
 *
 *  Los archivos se copiaron al repo del front en public/assets/blog/ con
 *  el nombre del slug, así que aquí sólo se reescribe la columna. Se
 *  actualiza por slug y no por id porque los ids se regeneran al sembrar
 *  una base nueva. down() devuelve las URLs originales una por una, que
 *  siguen existiendo en el hosting anterior (81.30.157.82).
 * ------------------------------------------------------------------ */

/* [slug, ruta nueva, URL original en WordPress] */
const IMAGENES: ReadonlyArray<readonly [string, string, string]> = [
  ['agua-para-sanar', '/assets/blog/agua-para-sanar.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2022/05/WhatsApp-Image-2022-05-19-at-2.13.58-PM.jpeg'],
  ['aprende-a-creer-crear-en-ti-misma', '/assets/blog/aprende-a-creer-crear-en-ti-misma.png', 'https://www.evelinedublan.com/wp-content/uploads/2025/10/Aprende-a-creer-crear-en-ti-misma-scaled.png'],
  ['como-terminar-una-relacion-y-no-morir-en-el-intento', '/assets/blog/como-terminar-una-relacion-y-no-morir-en-el-intento.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2022/08/BLOG.jpg'],
  ['con-amor-a-la-nina-que-hay-en-ti', '/assets/blog/con-amor-a-la-nina-que-hay-en-ti.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2023/04/Caption-This-Image-and-Selected-Wisepicks-17-March-2021.jpg'],
  ['hablemos-de-ansiedad', '/assets/blog/hablemos-de-ansiedad.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2020/09/ansiedad.jpg'],
  ['hierbas-que-curan-el-corazon', '/assets/blog/hierbas-que-curan-el-corazon.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2020/08/baño-de-hierbas.jpg'],
  ['limpieza-energetica-profunda-en-siete-dias', '/assets/blog/limpieza-energetica-profunda-en-siete-dias.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2023/05/plantas-medicinales.jpg'],
  ['mendigar-amor', '/assets/blog/mendigar-amor.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2022/05/332cf48a61f964e2b16b693dae454576.jpg'],
  ['perder-fragmentos-de-alma', '/assets/blog/perder-fragmentos-de-alma.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2025/01/fragmentos-de-alma.jpg'],
  ['por-que-mi-suegra-y-yo-no-nos-llevamos-bien', '/assets/blog/por-que-mi-suegra-y-yo-no-nos-llevamos-bien.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2025/08/constelacion_familiar.jpg'],
  ['que-son-los-lazos-oscuros', '/assets/blog/que-son-los-lazos-oscuros.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2020/08/We-Must-Focus-On-How-We-Can-Be-Better-To-Make-A-Change-In-This-World.jpg'],
  ['recomendaciones-para-contratar-una-celebracion-holistica', '/assets/blog/recomendaciones-para-contratar-una-celebracion-holistica.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2023/11/WINTER-SOLSTICE-Fine-Art-Women-Circle-Illustration-Print-Etsy.jpg'],
  ['sanar-tu-utero', '/assets/blog/sanar-tu-utero.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2020/07/tu-utero-sagrado.jpg'],
  ['solsticio-de-verano-2024', '/assets/blog/solsticio-de-verano-2024.jpg', 'https://www.evelinedublan.com/wp-content/uploads/2024/06/Litha-celebrando-el-solsticio-de-verano-con-flores-de-fuego-y-el-sol-_-Foto-Premium.jpg'],];

async function aplicar(q: ContextoMigracion['context'], indice: 1 | 2) {
  for (const fila of IMAGENES) {
    await q.sequelize.query('UPDATE posts SET imagen_url = :url, actualizado_en = NOW() WHERE slug = :slug;', {
      replacements: { slug: fila[0], url: fila[indice] },
    });
  }
}

export async function up({ context: q }: ContextoMigracion) {
  await aplicar(q, 1);
}

export async function down({ context: q }: ContextoMigracion) {
  await aplicar(q, 2);
}
