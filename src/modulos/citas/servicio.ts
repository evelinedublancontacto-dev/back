import { Op, UniqueConstraintError } from 'sequelize';
import { Cita, Cliente, Servicio } from '../../modelos';
import type { ModalidadAtencion } from '../../servicios/agenda';
import { correoCitaAdmin, correoCitaCliente, ETIQUETA_MODALIDAD } from '../../servicios/plantillaCorreo';
import { ESTADOS_VIVOS } from '../../modelos/Cita';
import { ErrorHttp } from '../../errores';
import { ahoraEnCDMX, esFechaISO, esHora, fechaLarga } from '../../servicios/fechas';
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

export { ETIQUETA_MODALIDAD };

/* ------------------------------------------------------------------ *
 *  Una cita por persona a la vez (regla de Eveline). "La misma persona"
 *  se reconoce por cualquiera de tres señales, para que no baste cambiar
 *  una letra: el correo, el teléfono (solo dígitos, últimos diez, así da
 *  igual +52, espacios o guiones) o el nombre (sin mayúsculas ni acentos).
 * ------------------------------------------------------------------ */

export type DatosPersona = { nombre: string; correo: string; telefono: string };

export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Últimos diez dígitos; vacío si no alcanza para ser un teléfono. */
export function normalizarTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '');
  return digitos.length >= 7 ? digitos.slice(-10) : '';
}

export function mismaPersona(a: DatosPersona, b: DatosPersona): boolean {
  if (a.correo.trim().toLowerCase() === b.correo.trim().toLowerCase()) return true;
  const telA = normalizarTelefono(a.telefono);
  if (telA && telA === normalizarTelefono(b.telefono)) return true;
  const nomA = normalizarNombre(a.nombre);
  return nomA.length > 0 && nomA === normalizarNombre(b.nombre);
}

/** Primera cita viva (pendiente o confirmada) por ocurrir de alguien que
    coincida en correo, teléfono o nombre con quien intenta reservar. Las
    citas vivas futuras son pocas, así que se comparan en memoria. */
export async function citaVivaPendiente(persona: DatosPersona, ahora: { fecha: string; hora: string }) {
  const vivas = await Cita.findAll({
    where: {
      estado: { [Op.in]: [...ESTADOS_VIVOS] },
      [Op.or]: [{ fecha: { [Op.gt]: ahora.fecha } }, { fecha: ahora.fecha, hora: { [Op.gt]: ahora.hora } }],
    },
    include: [{ model: Cliente, as: 'cliente', attributes: ['nombre', 'correo', 'telefono'] }],
    order: [['fecha', 'ASC'], ['hora', 'ASC']],
  });
  return vivas.find((c) => c.cliente && mismaPersona(persona, c.cliente)) ?? null;
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

  /* Antes de crear o actualizar al cliente: un intento repetido no debe
     pisar el nombre o teléfono guardados. */
  const persona = { nombre: d.nombre.trim(), correo: d.email, telefono: d.telefono.trim() };
  const previa = await citaVivaPendiente(persona, ahora);
  if (previa) {
    throw new ErrorHttp(
      409,
      'cita_ya_agendada',
      `Ya hay una cita agendada con estos datos para el ${fechaLarga(previa.fecha)} a las ${previa.hora.slice(0, 5)}. Solo se puede tener una cita a la vez; cuando se realice o se cancele podrás agendar la siguiente.`,
    );
  }

  const cliente = await obtenerOCrearCliente(persona);

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
  const detalle = {
    nombre: c.nombre,
    correo: c.correo,
    telefono: c.telefono,
    servicio: s.titulo,
    fechaLarga: fechaLarga(cita.fecha),
    hora: cita.hora.slice(0, 5),
    modalidad,
    notas: cita.notas,
  };

  const alCliente = enviarCorreo({ para: c.correo, ...correoCitaCliente(detalle) });
  const alAdmin = config.CORREO_ADMIN
    ? enviarCorreo({ para: config.CORREO_ADMIN, ...correoCitaAdmin(detalle), responderA: c.correo })
    : Promise.resolve(false);

  await Promise.allSettled([alCliente, alAdmin]);
}
