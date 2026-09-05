import { Elysia } from 'elysia';
import { Servicio } from '../../modelos';

export const rutasServicios = new Elysia({ prefix: '/servicios', tags: ['Servicios'] }).get(
  '/',
  async () => {
    const lista = await Servicio.findAll({ where: { activo: true }, order: [['orden', 'ASC'], ['titulo', 'ASC']] });
    return { servicios: lista.map((s) => s.publico()) };
  },
  { detail: { summary: 'Servicios activos que se pueden reservar' } },
);
