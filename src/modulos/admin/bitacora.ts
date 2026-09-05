import { Elysia, t } from 'elysia';
import { Bitacora } from '../../modelos';
import { soloAdmin } from '../../middleware/sesion';

export const adminBitacora = new Elysia({ prefix: '/bitacora', tags: ['Admin · Bitácora'] }).use(soloAdmin).get(
  '/',
  async ({ query }) => {
    const pagina = query.pagina ?? 1;
    const por_pagina = Math.min(query.por_pagina ?? 50, 200);
    const where = { ...(query.entidad ? { entidad: query.entidad } : {}), ...(query.entidad_id ? { entidad_id: query.entidad_id } : {}) };
    const { rows, count } = await Bitacora.findAndCountAll({ where, order: [['creado_en', 'DESC']], limit: por_pagina, offset: (pagina - 1) * por_pagina });
    return { registros: rows, total: count, pagina, por_pagina };
  },
  {
    query: t.Object({ entidad: t.Optional(t.String()), entidad_id: t.Optional(t.String()), pagina: t.Optional(t.Numeric({ minimum: 1 })), por_pagina: t.Optional(t.Numeric({ minimum: 1 })) }),
    detail: { summary: 'Historial de cambios administrativos, más reciente primero' },
  },
);
