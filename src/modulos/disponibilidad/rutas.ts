import { Elysia, t } from 'elysia';
import { disponibilidadDelDia } from './servicio';

export const rutasDisponibilidad = new Elysia({ prefix: '/disponibilidad', tags: ['Agenda'] }).get(
  '/',
  ({ query }) => disponibilidadDelDia(query.fecha, query.servicio ?? query.servicioId),
  {
    query: t.Object({
      fecha: t.String({ description: 'AAAA-MM-DD' }),
      servicio: t.Optional(t.String()),
      /** Nombre que usa hoy el front; se acepta durante la transición. */
      servicioId: t.Optional(t.String()),
    }),
    detail: { summary: 'Bloques de una fecha: horarios, bloqueos, reglas del servicio y citas ocupadas' },
  },
);
