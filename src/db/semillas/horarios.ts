import { Horario } from '../../modelos';

/* Lo que hoy está en código en el front: lunes a viernes de 9 a 17. */
export async function sembrarHorarios() {
  if ((await Horario.count()) > 0) return { creados: 0, omitido: true };
  await Horario.bulkCreate([1, 2, 3, 4, 5].map((dia) => ({ dia_semana: dia, hora_inicio: '09:00', hora_fin: '17:00' })));
  return { creados: 5, omitido: false };
}
