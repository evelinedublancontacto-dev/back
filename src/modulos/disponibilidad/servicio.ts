import { Op } from 'sequelize';
import { Bloqueo, Cita, Horario, HorarioFecha, Servicio } from '../../modelos';
import { ESTADOS_VIVOS } from '../../modelos/Cita';
import { calcularDisponibilidad, ventanasDelDia, type SalidaDisponibilidad } from '../../servicios/agenda';
import { ahoraEnCDMX, diaSemana, esFechaISO } from '../../servicios/fechas';
import { ErrorHttp } from '../../errores';

/** Disponibilidad de un día leyendo horarios (los de la fecha ganan a los de
 *  la semana), bloqueos y citas vivas. */
export async function disponibilidadDelDia(fecha: string, servicioId?: string): Promise<SalidaDisponibilidad> {
  if (!esFechaISO(fecha)) throw new ErrorHttp(400, 'fecha_invalida', 'La fecha debe tener la forma AAAA-MM-DD.');

  const servicio = servicioId ? await Servicio.findByPk(servicioId) : null;
  if (servicioId && (!servicio || !servicio.activo)) {
    throw new ErrorHttp(404, 'servicio_no_encontrado', 'Ese servicio no existe o no está activo.');
  }

  const [semanales, deLaFecha, bloqueos, citas] = await Promise.all([
    Horario.findAll({ where: { dia_semana: diaSemana(fecha), activo: true } }),
    HorarioFecha.findAll({ where: { fecha }, order: [['hora_inicio', 'ASC']] }),
    Bloqueo.findAll({ where: { fecha } }),
    Cita.findAll({ where: { fecha, estado: { [Op.in]: [...ESTADOS_VIVOS] } }, attributes: ['hora'] }),
  ]);

  return calcularDisponibilidad({
    fecha,
    horarios: ventanasDelDia(semanales, deLaFecha),
    bloqueos,
    horasOcupadas: citas.map((c) => c.hora),
    reglas: servicio?.reglas,
    ahora: ahoraEnCDMX(),
  });
}
