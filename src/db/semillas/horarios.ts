import { Horario } from '../../modelos';

/* Agenda semanal de Eveline. dia_semana: 0 domingo … 6 sábado.
   La hora_fin es exclusiva: 10:00–13:00 genera las 10, las 11 y las 12. */
const HORARIOS = [
  { dia_semana: 1, hora_inicio: '10:00', hora_fin: '13:00' }, // lunes:     10, 11, 12
  { dia_semana: 2, hora_inicio: '15:00', hora_fin: '19:00' }, // martes:    15, 16, 17, 18
  { dia_semana: 3, hora_inicio: '10:00', hora_fin: '13:00' }, // miércoles: 10, 11, 12
  { dia_semana: 5, hora_inicio: '09:00', hora_fin: '13:00' }, // viernes:    9, 10, 11, 12
];

export async function sembrarHorarios() {
  if ((await Horario.count()) > 0) return { creados: 0, omitido: true };
  await Horario.bulkCreate(HORARIOS);
  return { creados: HORARIOS.length, omitido: false };
}
