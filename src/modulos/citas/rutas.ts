import { Elysia } from 'elysia';
import { cuerpoNuevaCita } from './esquemas';
import { crearCitaPublica } from './servicio';
import { crearLimitador, obtenerIP } from '../../middleware/rateLimit';

const limitarReservas = crearLimitador('reservas', 5, 10 * 60 * 1000);

export const rutasCitas = new Elysia({ prefix: '/citas', tags: ['Agenda'] }).post(
  '/',
  async ({ body, request, server, set }) => {
    if (body.sitioWeb) {
      set.status = 201;
      return { cita: null }; // bot: fingimos éxito y no guardamos nada
    }
    limitarReservas(obtenerIP(request, server));
    const { cita, modalidad } = await crearCitaPublica(body);
    set.status = 201;
    return { cita: { ...cita.plana(), modalidad: modalidad ?? null } };
  },
  {
    body: cuerpoNuevaCita,
    detail: {
      summary: 'Reservar una cita (público)',
      description:
        'Crea el cliente si no existe y una cita en estado pendiente. 409 horario_ocupado si el bloque acaba de tomarse; 409 cita_ya_agendada si esa persona ya tiene una cita viva por ocurrir (solo una a la vez).',
    },
  },
);
