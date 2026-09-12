/* ------------------------------------------------------------------ *
 *  src/modulos/admin/catalogos.ts
 *  CRUD de servicios, horarios (semanales y de una fecha), bloqueos y
 *  clientes. Cinco recursos con la misma forma: listar, crear, actualizar,
 *  borrar, todo en bitácora.
 * ------------------------------------------------------------------ */

import { Elysia, t } from 'elysia';
import { ForeignKeyConstraintError, Op, UniqueConstraintError } from 'sequelize';
import { Bloqueo, Cita, Cliente, Horario, HorarioFecha, MODALIDADES, Servicio } from '../../modelos';
import { soloAdmin } from '../../middleware/sesion';
import { ErrorHttp } from '../../errores';
import { registrar } from '../../servicios/bitacora';
import { esFechaISO, esHora } from '../../servicios/fechas';
import { aSlug } from '../../servicios/slug';

const HORA = t.String({ pattern: '^\\d{2}:\\d{2}$' });
const MODALIDAD = t.Union(MODALIDADES.map((m) => t.Literal(m)));

const reglas = t.Optional(
  t.Object({
    dias_permitidos: t.Optional(t.Array(t.Integer({ minimum: 0, maximum: 6 }))),
    modalidad: t.Optional(t.Union([t.Literal('presencial'), t.Literal('en_linea'), t.Literal('a_distancia'), t.Literal('ambas')])),
    mensaje_dias: t.Optional(t.String({ maxLength: 300 })),
  }),
);

/* ------------------------------------------------------------ servicios */
export const adminServicios = new Elysia({ prefix: '/servicios', tags: ['Admin · Catálogos'] })
  .use(soloAdmin)
  .get('/', async () => ({ servicios: (await Servicio.findAll({ order: [['orden', 'ASC'], ['titulo', 'ASC']] })).map((s) => ({ ...s.publico(), activo: s.activo, orden: s.orden })) }), {
    detail: { summary: 'Todos los servicios, activos o no' },
  })
  .post(
    '/',
    async ({ body, actor, set }) => {
      const id = body.id ? aSlug(body.id) : aSlug(body.titulo);
      if (!id) throw new ErrorHttp(400, 'id_invalido', 'No se pudo derivar un identificador del título.');
      const servicio = await Servicio.create({ ...body, id, reglas: body.reglas ?? {} }).catch((e: unknown) => {
        if (e instanceof UniqueConstraintError) throw new ErrorHttp(409, 'servicio_duplicado', `Ya existe un servicio con id "${id}".`);
        throw e;
      });
      void registrar(actor, 'crear', 'servicio', id, null, servicio.toJSON());
      set.status = 201;
      return { servicio: { ...servicio.publico(), activo: servicio.activo, orden: servicio.orden } };
    },
    {
      body: t.Object({
        id: t.Optional(t.String({ maxLength: 80 })),
        titulo: t.String({ minLength: 2, maxLength: 160 }),
        descripcion: t.Optional(t.String({ maxLength: 2000 })),
        duracion_min: t.Integer({ minimum: 5, maximum: 600 }),
        precio: t.Number({ minimum: 0 }),
        activo: t.Optional(t.Boolean()),
        orden: t.Optional(t.Integer()),
        reglas,
      }),
      detail: { summary: 'Crear servicio (el id se deriva del título si no se manda)' },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, actor }) => {
      const s = await Servicio.findByPk(params.id);
      if (!s) throw new ErrorHttp(404, 'servicio_no_encontrado', 'Ese servicio no existe.');
      const antes = s.toJSON();
      await s.update(body);
      void registrar(actor, 'actualizar', 'servicio', s.id, antes, s.toJSON());
      return { servicio: { ...s.publico(), activo: s.activo, orden: s.orden } };
    },
    {
      body: t.Partial(
        t.Object({
          titulo: t.String({ minLength: 2, maxLength: 160 }),
          descripcion: t.String({ maxLength: 2000 }),
          duracion_min: t.Integer({ minimum: 5, maximum: 600 }),
          precio: t.Number({ minimum: 0 }),
          activo: t.Boolean(),
          orden: t.Integer(),
          reglas: t.Object({
            dias_permitidos: t.Optional(t.Array(t.Integer({ minimum: 0, maximum: 6 }))),
            modalidad: t.Optional(t.Union([t.Literal('presencial'), t.Literal('en_linea'), t.Literal('ambas')])),
            mensaje_dias: t.Optional(t.String({ maxLength: 300 })),
          }),
        }),
      ),
      detail: { summary: 'Editar servicio' },
    },
  )
  .delete(
    '/:id',
    async ({ params, actor }) => {
      const s = await Servicio.findByPk(params.id);
      if (!s) throw new ErrorHttp(404, 'servicio_no_encontrado', 'Ese servicio no existe.');
      const antes = s.toJSON();
      await s.destroy().catch((e: unknown) => {
        if (e instanceof ForeignKeyConstraintError) {
          throw new ErrorHttp(409, 'servicio_con_citas', 'Tiene citas asociadas. Desactívelo en lugar de borrarlo.');
        }
        throw e;
      });
      void registrar(actor, 'borrar', 'servicio', params.id, antes, null);
      return { ok: true };
    },
    { detail: { summary: 'Borrar servicio sin citas; con citas, 409' } },
  );

/* ------------------------------------------------------------- horarios */
export const adminHorarios = new Elysia({ prefix: '/horarios', tags: ['Admin · Catálogos'] })
  .use(soloAdmin)
  .get('/', async () => ({ horarios: await Horario.findAll({ order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']] }) }), { detail: { summary: 'Ventanas semanales' } })
  .post(
    '/',
    async ({ body, actor, set }) => {
      if (body.hora_fin <= body.hora_inicio) throw new ErrorHttp(400, 'rango_invalido', 'La hora de fin debe ser mayor que la de inicio.');
      const h = await Horario.create(body);
      void registrar(actor, 'crear', 'horario', h.id, null, h.toJSON());
      set.status = 201;
      return { horario: h };
    },
    {
      body: t.Object({ dia_semana: t.Integer({ minimum: 0, maximum: 6 }), hora_inicio: HORA, hora_fin: HORA, activo: t.Optional(t.Boolean()), modalidad: t.Optional(MODALIDAD) }),
      detail: { summary: 'Agregar ventana de atención (modalidad: presencial o en_linea)' },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, actor }) => {
      const h = await Horario.findByPk(params.id);
      if (!h) throw new ErrorHttp(404, 'horario_no_encontrado', 'Ese horario no existe.');
      const antes = h.toJSON();
      const inicio = body.hora_inicio ?? h.hora_inicio;
      const fin = body.hora_fin ?? h.hora_fin;
      if (fin <= inicio) throw new ErrorHttp(400, 'rango_invalido', 'La hora de fin debe ser mayor que la de inicio.');
      await h.update(body);
      void registrar(actor, 'actualizar', 'horario', h.id, antes, h.toJSON());
      return { horario: h };
    },
    { body: t.Partial(t.Object({ dia_semana: t.Integer({ minimum: 0, maximum: 6 }), hora_inicio: HORA, hora_fin: HORA, activo: t.Boolean(), modalidad: MODALIDAD })), detail: { summary: 'Editar ventana' } },
  )
  .delete(
    '/:id',
    async ({ params, actor }) => {
      const h = await Horario.findByPk(params.id);
      if (!h) throw new ErrorHttp(404, 'horario_no_encontrado', 'Ese horario no existe.');
      const antes = h.toJSON();
      await h.destroy();
      void registrar(actor, 'borrar', 'horario', params.id, antes, null);
      return { ok: true };
    },
    { detail: { summary: 'Quitar ventana' } },
  );

/* ------------------------------------------------- horarios de una fecha */
/* Lo que los bloqueos no saben hacer: abrir o mover horas un día suelto.
   Si una fecha tiene ventanas aquí, sustituyen a las de su día de la semana. */
export const adminHorariosFecha = new Elysia({ prefix: '/horarios-fecha', tags: ['Admin · Catálogos'] })
  .use(soloAdmin)
  .get(
    '/',
    async ({ query }) => ({
      horarios: await HorarioFecha.findAll({
        where: query.desde ? { fecha: { [Op.gte]: query.desde } } : {},
        order: [['fecha', 'ASC'], ['hora_inicio', 'ASC']],
      }),
    }),
    { query: t.Object({ desde: t.Optional(t.String()) }), detail: { summary: 'Horarios por fecha; con ?desde= solo de esa fecha en adelante' } },
  )
  .post(
    '/',
    async ({ body, actor, set }) => {
      if (!esFechaISO(body.fecha)) throw new ErrorHttp(400, 'fecha_invalida', 'La fecha debe tener la forma AAAA-MM-DD.');
      if (body.hora_fin <= body.hora_inicio) throw new ErrorHttp(400, 'rango_invalido', 'La hora de fin debe ser mayor que la de inicio.');
      const h = await HorarioFecha.create(body);
      void registrar(actor, 'crear', 'horario_fecha', h.id, null, h.toJSON());
      set.status = 201;
      return { horario: h };
    },
    {
      body: t.Object({ fecha: t.String(), hora_inicio: HORA, hora_fin: HORA, modalidad: t.Optional(MODALIDAD), nota: t.Optional(t.String({ maxLength: 200 })) }),
      detail: { summary: 'Abrir una ventana solo para esa fecha' },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, actor }) => {
      const h = await HorarioFecha.findByPk(params.id);
      if (!h) throw new ErrorHttp(404, 'horario_no_encontrado', 'Ese horario no existe.');
      if (body.fecha !== undefined && !esFechaISO(body.fecha)) throw new ErrorHttp(400, 'fecha_invalida', 'La fecha debe tener la forma AAAA-MM-DD.');
      const antes = h.toJSON();
      const inicio = body.hora_inicio ?? h.hora_inicio;
      const fin = body.hora_fin ?? h.hora_fin;
      if (fin <= inicio) throw new ErrorHttp(400, 'rango_invalido', 'La hora de fin debe ser mayor que la de inicio.');
      await h.update(body);
      void registrar(actor, 'actualizar', 'horario_fecha', h.id, antes, h.toJSON());
      return { horario: h };
    },
    {
      body: t.Partial(t.Object({ fecha: t.String(), hora_inicio: HORA, hora_fin: HORA, modalidad: MODALIDAD, nota: t.String({ maxLength: 200 }) })),
      detail: { summary: 'Editar una ventana de fecha' },
    },
  )
  .delete(
    '/:id',
    async ({ params, actor }) => {
      const h = await HorarioFecha.findByPk(params.id);
      if (!h) throw new ErrorHttp(404, 'horario_no_encontrado', 'Ese horario no existe.');
      const antes = h.toJSON();
      await h.destroy();
      void registrar(actor, 'borrar', 'horario_fecha', params.id, antes, null);
      return { ok: true };
    },
    { detail: { summary: 'Quitar ventana de fecha; la fecha vuelve a su horario semanal' } },
  );

/* ------------------------------------------------------------- bloqueos */
export const adminBloqueos = new Elysia({ prefix: '/bloqueos', tags: ['Admin · Catálogos'] })
  .use(soloAdmin)
  .get(
    '/',
    async ({ query }) => ({
      bloqueos: await Bloqueo.findAll({
        where: query.desde ? { fecha: { [Op.gte]: query.desde } } : {},
        order: [['fecha', 'ASC'], ['hora_inicio', 'ASC']],
      }),
    }),
    { query: t.Object({ desde: t.Optional(t.String()) }), detail: { summary: 'Bloqueos; por defecto todos, con ?desde= solo futuros' } },
  )
  .post(
    '/',
    async ({ body, actor, set }) => {
      if (!esFechaISO(body.fecha)) throw new ErrorHttp(400, 'fecha_invalida', 'Fecha inválida.');
      const parcial = body.hora_inicio !== undefined || body.hora_fin !== undefined;
      if (parcial && (!body.hora_inicio || !body.hora_fin || !esHora(body.hora_inicio) || !esHora(body.hora_fin) || body.hora_fin <= body.hora_inicio)) {
        throw new ErrorHttp(400, 'rango_invalido', 'Para bloquear horas indique inicio y fin válidos; para el día completo, no mande horas.');
      }
      const b = await Bloqueo.create({ fecha: body.fecha, hora_inicio: body.hora_inicio ?? null, hora_fin: body.hora_fin ?? null, motivo: body.motivo ?? '' });
      void registrar(actor, 'crear', 'bloqueo', b.id, null, b.toJSON());
      set.status = 201;
      return { bloqueo: b };
    },
    {
      body: t.Object({ fecha: t.String(), hora_inicio: t.Optional(HORA), hora_fin: t.Optional(HORA), motivo: t.Optional(t.String({ maxLength: 200 })) }),
      detail: { summary: 'Bloquear un día completo o un rango de horas' },
    },
  )
  .delete(
    '/:id',
    async ({ params, actor }) => {
      const b = await Bloqueo.findByPk(params.id);
      if (!b) throw new ErrorHttp(404, 'bloqueo_no_encontrado', 'Ese bloqueo no existe.');
      const antes = b.toJSON();
      await b.destroy();
      void registrar(actor, 'borrar', 'bloqueo', params.id, antes, null);
      return { ok: true };
    },
    { detail: { summary: 'Quitar bloqueo' } },
  );

/* ------------------------------------------------------------- clientes */
export const adminClientes = new Elysia({ prefix: '/clientes', tags: ['Admin · Catálogos'] })
  .use(soloAdmin)
  .get(
    '/',
    async ({ query }) => {
      const q = query.q?.trim();
      const where = q ? { [Op.or]: [{ nombre: { [Op.iLike]: `%${q}%` } }, { correo: { [Op.iLike]: `%${q}%` } }, { telefono: { [Op.iLike]: `%${q}%` } }] } : {};
      const pagina = query.pagina ?? 1;
      const por_pagina = Math.min(query.por_pagina ?? 50, 200);
      const { rows, count } = await Cliente.findAndCountAll({ where, order: [['nombre', 'ASC']], limit: por_pagina, offset: (pagina - 1) * por_pagina });
      return { clientes: rows, total: count, pagina, por_pagina };
    },
    {
      query: t.Object({ q: t.Optional(t.String()), pagina: t.Optional(t.Numeric({ minimum: 1 })), por_pagina: t.Optional(t.Numeric({ minimum: 1 })) }),
      detail: { summary: 'Buscar clientes por nombre, correo o teléfono' },
    },
  )
  .get(
    '/:id',
    async ({ params }) => {
      const c = await Cliente.findByPk(params.id, { include: [{ model: Cita, as: 'citas', include: [{ model: Servicio, as: 'servicio' }] }] });
      if (!c) throw new ErrorHttp(404, 'cliente_no_encontrado', 'Ese cliente no existe.');
      return { cliente: c };
    },
    { detail: { summary: 'Un cliente con sus citas' } },
  )
  .post(
    '/',
    async ({ body, actor, set }) => {
      const c = await Cliente.create({ ...body, correo: body.correo.trim().toLowerCase() }).catch((e: unknown) => {
        if (e instanceof UniqueConstraintError) throw new ErrorHttp(409, 'cliente_duplicado', 'Ya hay un cliente con ese correo.');
        throw e;
      });
      void registrar(actor, 'crear', 'cliente', c.id, null, c.toJSON());
      set.status = 201;
      return { cliente: c };
    },
    {
      body: t.Object({ nombre: t.String({ minLength: 2, maxLength: 160 }), correo: t.String({ format: 'email' }), telefono: t.Optional(t.String({ maxLength: 40 })), notas: t.Optional(t.String({ maxLength: 2000 })) }),
      detail: { summary: 'Crear cliente (sin cuenta de acceso)' },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, actor }) => {
      const c = await Cliente.findByPk(params.id);
      if (!c) throw new ErrorHttp(404, 'cliente_no_encontrado', 'Ese cliente no existe.');
      const antes = c.toJSON();
      await c.update({ ...body, ...(body.correo ? { correo: body.correo.trim().toLowerCase() } : {}) }).catch((e: unknown) => {
        if (e instanceof UniqueConstraintError) throw new ErrorHttp(409, 'cliente_duplicado', 'Ya hay un cliente con ese correo.');
        throw e;
      });
      void registrar(actor, 'actualizar', 'cliente', c.id, antes, c.toJSON());
      return { cliente: c };
    },
    { body: t.Partial(t.Object({ nombre: t.String({ minLength: 2, maxLength: 160 }), correo: t.String({ format: 'email' }), telefono: t.String({ maxLength: 40 }), notas: t.String({ maxLength: 2000 }) })), detail: { summary: 'Editar cliente' } },
  )
  .delete(
    '/:id',
    async ({ params, actor }) => {
      const c = await Cliente.findByPk(params.id);
      if (!c) throw new ErrorHttp(404, 'cliente_no_encontrado', 'Ese cliente no existe.');
      const antes = c.toJSON();
      await c.destroy().catch((e: unknown) => {
        if (e instanceof ForeignKeyConstraintError) throw new ErrorHttp(409, 'cliente_con_citas', 'Tiene citas asociadas; no se puede borrar.');
        throw e;
      });
      void registrar(actor, 'borrar', 'cliente', params.id, antes, null);
      return { ok: true };
    },
    { detail: { summary: 'Borrar cliente sin citas; con citas, 409' } },
  );
