import { Elysia, t } from 'elysia';
import { Op, UniqueConstraintError, type WhereOptions } from 'sequelize';
import { Cita, Cliente, Servicio } from '../../modelos';
import { ESTADOS_CITA } from '../../modelos/Cita';
import { soloAdmin } from '../../middleware/sesion';
import { ErrorHttp } from '../../errores';
import { registrar } from '../../servicios/bitacora';
import { esFechaISO, esHora } from '../../servicios/fechas';
import { obtenerOCrearCliente } from '../citas/servicio';

const incluir = [
  { model: Cliente, as: 'cliente' },
  { model: Servicio, as: 'servicio' },
];

async function cargar(id: string) {
  const cita = await Cita.findByPk(id, { include: incluir });
  if (!cita) throw new ErrorHttp(404, 'cita_no_encontrada', 'Esa cita no existe.');
  return cita;
}

function conflictoHorario(error: unknown): never {
  if (error instanceof UniqueConstraintError) throw new ErrorHttp(409, 'horario_ocupado', 'Ya hay una cita viva en ese horario.');
  throw error;
}

export const adminCitas = new Elysia({ prefix: '/citas', tags: ['Admin · Citas'] })
  .use(soloAdmin)
  .get(
    '/',
    async ({ query }) => {
      const where: WhereOptions = {};
      if (query.estado) where.estado = query.estado;
      if (query.desde || query.hasta) {
        where.fecha = { ...(query.desde ? { [Op.gte]: query.desde } : {}), ...(query.hasta ? { [Op.lte]: query.hasta } : {}) };
      }
      const pagina = query.pagina ?? 1;
      const por_pagina = Math.min(query.por_pagina ?? 50, 200);
      const { rows, count } = await Cita.findAndCountAll({
        where,
        include: incluir,
        order: [['fecha', 'DESC'], ['hora', 'DESC']],
        limit: por_pagina,
        offset: (pagina - 1) * por_pagina,
      });
      return { citas: rows.map((c) => c.plana()), total: count, pagina, por_pagina };
    },
    {
      query: t.Object({
        estado: t.Optional(t.Union(ESTADOS_CITA.map((e) => t.Literal(e)))),
        desde: t.Optional(t.String()),
        hasta: t.Optional(t.String()),
        pagina: t.Optional(t.Numeric({ minimum: 1 })),
        por_pagina: t.Optional(t.Numeric({ minimum: 1 })),
      }),
      detail: { summary: 'Listar citas con filtros y paginación' },
    },
  )
  .get('/:id', async ({ params }) => ({ cita: (await cargar(params.id)).plana() }), { detail: { summary: 'Una cita' } })
  .post(
    '/',
    async ({ body, actor, set }) => {
      if (!esFechaISO(body.fecha) || !esHora(body.hora)) throw new ErrorHttp(400, 'fecha_invalida', 'Fecha u hora inválidas.');
      const servicio = await Servicio.findByPk(body.servicio);
      if (!servicio) throw new ErrorHttp(404, 'servicio_no_encontrado', 'Ese servicio no existe.');
      const cliente = await obtenerOCrearCliente({ nombre: body.nombre, correo: body.email, telefono: body.telefono });
      /* El admin puede agendar fuera del horario público; el índice único
         sigue impidiendo dos citas vivas a la misma hora. */
      const cita = await Cita.create({
        cliente_id: cliente.id,
        servicio_id: servicio.id,
        fecha: body.fecha,
        hora: body.hora,
        estado: body.estado ?? 'confirmada',
        notas: body.notas ?? '',
        primera_cita: body.primeraCita ?? false,
        origen: 'admin',
      }).catch(conflictoHorario);
      const completa = await cargar(cita.id);
      void registrar(actor, 'crear', 'cita', cita.id, null, completa.plana());
      set.status = 201;
      return { cita: completa.plana() };
    },
    {
      body: t.Object({
        nombre: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' }),
        telefono: t.String({ minLength: 7 }),
        servicio: t.String(),
        fecha: t.String(),
        hora: t.String(),
        estado: t.Optional(t.Union(ESTADOS_CITA.map((e) => t.Literal(e)))),
        notas: t.Optional(t.String()),
        primeraCita: t.Optional(t.Boolean()),
      }),
      detail: { summary: 'Crear una cita a mano (por defecto confirmada)' },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, actor }) => {
      const cita = await cargar(params.id);
      const antes = cita.plana();
      if (body.fecha !== undefined && !esFechaISO(body.fecha)) throw new ErrorHttp(400, 'fecha_invalida', 'Fecha inválida.');
      if (body.hora !== undefined && !esHora(body.hora)) throw new ErrorHttp(400, 'hora_invalida', 'Hora inválida.');
      if (body.servicio !== undefined && !(await Servicio.findByPk(body.servicio))) {
        throw new ErrorHttp(404, 'servicio_no_encontrado', 'Ese servicio no existe.');
      }
      await cita
        .update({
          ...(body.estado !== undefined ? { estado: body.estado } : {}),
          ...(body.fecha !== undefined ? { fecha: body.fecha } : {}),
          ...(body.hora !== undefined ? { hora: body.hora } : {}),
          ...(body.notas !== undefined ? { notas: body.notas } : {}),
          ...(body.servicio !== undefined ? { servicio_id: body.servicio } : {}),
          ...(body.primeraCita !== undefined ? { primera_cita: body.primeraCita } : {}),
        })
        .catch(conflictoHorario);
      if (body.nombre !== undefined || body.telefono !== undefined) {
        await cita.cliente!.update({
          ...(body.nombre !== undefined ? { nombre: body.nombre } : {}),
          ...(body.telefono !== undefined ? { telefono: body.telefono } : {}),
        });
      }
      const despues = (await cargar(cita.id)).plana();
      void registrar(actor, 'actualizar', 'cita', cita.id, antes, despues);
      return { cita: despues };
    },
    {
      body: t.Object({
        estado: t.Optional(t.Union(ESTADOS_CITA.map((e) => t.Literal(e)))),
        fecha: t.Optional(t.String()),
        hora: t.Optional(t.String()),
        notas: t.Optional(t.String()),
        servicio: t.Optional(t.String()),
        nombre: t.Optional(t.String({ minLength: 2 })),
        telefono: t.Optional(t.String({ minLength: 7 })),
        primeraCita: t.Optional(t.Boolean()),
      }),
      detail: { summary: 'Cambiar estado o datos de una cita' },
    },
  )
  .delete(
    '/:id',
    async ({ params, actor }) => {
      const cita = await cargar(params.id);
      const antes = cita.plana();
      await cita.destroy();
      void registrar(actor, 'borrar', 'cita', params.id, antes, null);
      return { ok: true };
    },
    { detail: { summary: 'Borrar una cita (prefiera cancelarla para conservar historial)' } },
  );
