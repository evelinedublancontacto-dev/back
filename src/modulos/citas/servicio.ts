import { Op, UniqueConstraintError } from 'sequelize';
import { Cita, Cliente, Servicio } from '../../modelos';
import type { ModalidadAtencion } from '../../servicios/agenda';
import { ESTADOS_VIVOS } from '../../modelos/Cita';
import { ErrorHttp } from '../../errores';
import { ahoraEnCDMX, esFechaISO, esHora } from '../../servicios/fechas';
import { enviarCorreo } from '../../servicios/correo';
import { config } from '../../config';
import { disponibilidadDelDia } from '../disponibilidad/servicio';
import type { CuerpoNuevaCita } from './esquemas';

/** Busca por correo sin distinguir mayúsculas; si no existe, lo crea.
    Ante una carrera entre dos reservas del mismo correo, el índice único
    hace fallar a la segunda y aquí se vuelve a buscar. */
export async function obtenerOCrearCliente(datos: { nombre: string; correo: string; telefono: string }) {
  const correo = datos.correo.trim().toLowerCase();
  const existente = await Cliente.findOne({ where: { correo } });
  if (existente) {
    /* Actualiza nombre y teléfono si vienen distintos: el cliente sabe mejor. */
    if (existente.nombre !== datos.nombre || existente.telefono !== datos.telefono) {
      await existente.update({ nombre: datos.nombre, telefono: datos.telefono });
    }
    return existente;
  }
  try {
    return await Cliente.create({ nombre: datos.nombre, correo, telefono: datos.telefono });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      const otra = await Cliente.findOne({ where: { correo } });
      if (otra) return otra;
    }
    throw error;
  }
}

export const ETIQUETA_MODALIDAD: Record<ModalidadAtencion, string> = {
  presencial: 'Presencial, en consultorio',
  en_linea: 'En línea (videollamada)',
  a_distancia: 'A distancia, asíncrona (no requiere conectarse)',
};

/** Cita viva (pendiente o confirmada) del cliente que todavía no ocurre.
    Regla de Eveline: una persona solo puede tener una cita agendada a la
    vez; la siguiente se agenda cuando esta se realice o se cancele. */
export async function citaVivaPendiente(clienteId: string, ahora: { fecha: string; hora: string }) {
  return Cita.findOne({
    where: {
      cliente_id: clienteId,
      estado: { [Op.in]: [...ESTADOS_VIVOS] },
      [Op.or]: [{ fecha: { [Op.gt]: ahora.fecha } }, { fecha: ahora.fecha, hora: { [Op.gt]: ahora.hora } }],
    },
    order: [['fecha', 'ASC'], ['hora', 'ASC']],
  });
}

function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, d)));
}

export async function crearCitaPublica(d: CuerpoNuevaCita): Promise<{ cita: Cita; modalidad?: ModalidadAtencion }> {
  if (!esFechaISO(d.fecha)) throw new ErrorHttp(400, 'fecha_invalida', 'La fecha no es válida.');
  if (!esHora(d.hora)) throw new ErrorHttp(400, 'hora_invalida', 'La hora no es válida.');

  const servicio = await Servicio.findByPk(d.servicio);
  if (!servicio || !servicio.activo) {
    throw new ErrorHttp(404, 'servicio_no_encontrado', 'Ese servicio no existe o no está activo.');
  }

  const ahora = ahoraEnCDMX();
  if (d.fecha < ahora.fecha || (d.fecha === ahora.fecha && d.hora <= ahora.hora)) {
    throw new ErrorHttp(400, 'fecha_pasada', 'Esa fecha y hora ya pasaron.');
  }

  const disponibilidad = await disponibilidadDelDia(d.fecha, servicio.id);
  const bloque = disponibilidad.slots.find((s) => s.hora === d.hora);
  if (!bloque) {
    throw new ErrorHttp(400, 'hora_fuera_de_horario', disponibilidad.mensaje ?? 'Esa hora no está dentro del horario de atención.');
  }
  if (!bloque.disponible) {
    throw new ErrorHttp(409, 'horario_ocupado', 'Ese horario acaba de ocuparse. Elija otro, por favor.');
  }

  const cliente = await obtenerOCrearCliente({ nombre: d.nombre.trim(), correo: d.email, telefono: d.telefono.trim() });

  const previa = await citaVivaPendiente(cliente.id, ahora);
  if (previa) {
    throw new ErrorHttp(
      409,
      'cita_ya_agendada',
      `Ya tienes una cita agendada para el ${fechaLarga(previa.fecha)} a las ${previa.hora.slice(0, 5)}. Solo se puede tener una cita a la vez; cuando se realice o se cancele podrás agendar la siguiente.`,
    );
  }

  let cita: Cita;
  try {
    cita = await Cita.create({
      cliente_id: cliente.id,
      servicio_id: servicio.id,
      fecha: d.fecha,
      hora: d.hora,
      notas: d.notas?.trim() ?? '',
      origen: 'web',
    });
  } catch (error) {
    /* La comprobación de arriba y esta inserción no son atómicas: si dos
       personas pasaron la comprobación a la vez, el índice único decide. */
    if (error instanceof UniqueConstraintError) {
      throw new ErrorHttp(409, 'horario_ocupado', 'Ese horario acaba de ocuparse. Elija otro, por favor.');
    }
    throw error;
  }

  cita.cliente = cliente;
  cita.servicio = servicio;
  void notificarReserva(cita, disponibilidad.modalidad);
  return { cita, modalidad: disponibilidad.modalidad };
}

async function notificarReserva(cita: Cita, modalidad?: ModalidadAtencion) {
  const c = cita.cliente!;
  const s = cita.servicio!;
  const cuando = `${cita.fecha} a las ${cita.hora} (hora del centro de México)`;
  const comoSeAtiende = modalidad ? ETIQUETA_MODALIDAD[modalidad] : null;

  const alCliente = enviarCorreo({
    para: c.correo,
    asunto: `Recibimos tu solicitud: ${s.titulo}`,
    texto: [
      `Hola ${c.nombre},`,
      '',
      `Recibimos tu solicitud de cita para ${s.titulo} el ${cuando}.`,
      comoSeAtiende ? `Modalidad: ${comoSeAtiende}.` : null,
      'Eveline la confirmará en breve por este medio o por WhatsApp.',
      '',
      cita.notas ? `Tus notas: ${cita.notas}` : null,
      'Si necesitas cambiarla, responde a este correo.',
    ]
      .filter((l) => l !== null)
      .join('\n'),
  });

  const alAdmin = config.CORREO_ADMIN
    ? enviarCorreo({
        para: config.CORREO_ADMIN,
        asunto: `Nueva cita: ${s.titulo} · ${cita.fecha} ${cita.hora}`,
        texto: [
          `Servicio:  ${s.titulo}`,
          `Cuándo:    ${cuando}`,
          comoSeAtiende ? `Modalidad: ${comoSeAtiende}` : null,
          `Cliente:   ${c.nombre}`,
          `Correo:    ${c.correo}`,
          `Teléfono:  ${c.telefono}`,
          cita.notas ? `Notas:     ${cita.notas}` : null,
        ]
          .filter((l) => l !== null)
          .join('\n'),
        responderA: c.correo,
      })
    : Promise.resolve(false);

  await Promise.allSettled([alCliente, alAdmin]);
}
