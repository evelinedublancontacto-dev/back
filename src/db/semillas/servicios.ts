import { Servicio, type ReglasServicio } from '../../modelos';

/* Copia de src/data/services.json del front, más las reglas que hoy están
   escritas en código: cuencos tibetanos solo viernes y presencial.
   Eveline no ofrece la meditación guiada ni la terapia de parejas: se siembran
   inactivas para conservar el registro (citas viejas) sin mostrarlas en la agenda. */
const SERVICIOS: Array<{
  id: string;
  titulo: string;
  descripcion: string;
  duracion_min: number;
  precio: number;
  orden: number;
  activo?: boolean;
  reglas?: ReglasServicio;
}> = [
  { id: 'psicoterapia', titulo: 'Sesión de Psicoterapia', descripcion: 'Sesión individual de psicoterapia para trabajar emociones, ansiedad, depresión o cualquier tema personal.', duracion_min: 60, precio: 600, orden: 1 },
  { id: 'sanacion-energetica', titulo: 'Sanación Energética', descripcion: 'Limpieza y armonización de chakras para restaurar el equilibrio energético de tu cuerpo.', duracion_min: 60, precio: 700, orden: 2 },
  {
    id: 'cuencos-tibetanos',
    titulo: 'Terapia con Cuencos Tibetanos',
    descripcion: 'Sesión de sonido terapéutico con cuencos tibetanos para relajación profunda y sanación.',
    duracion_min: 45,
    precio: 600,
    orden: 3,
    reglas: { dias_permitidos: [5], modalidad: 'presencial', mensaje_dias: 'Los cuencos tibetanos solo se agendan los viernes (hora del centro de México).' },
  },
  { id: 'meditacion-guiada', titulo: 'Meditación Guiada Personalizada', descripcion: 'Sesión de meditación personalizada para encontrar paz interior y claridad mental.', duracion_min: 40, precio: 500, orden: 4, activo: false },
  { id: 'terapia-parejas', titulo: 'Terapia de Parejas', descripcion: 'Sesión para trabajar la comunicación, confianza y conexión en tu relación.', duracion_min: 75, precio: 1200, orden: 5, activo: false },
  { id: 'sesion-cumpleanos', titulo: 'Sesión Especial de Cumpleaños', descripcion: 'Una sesión especial de sanación y energía positiva para celebrar tu nuevo año de vida.', duracion_min: 60, precio: 700, orden: 6 },
  {
    id: 'sanacion-con-velas',
    titulo: 'Sanación con Velas',
    descripcion: 'Ritual de fuego a distancia para transmutar lo denso y acompañar tu proceso. Se realiza de forma asíncrona desde el consultorio; la hora agendada es cuando inicia el ritual.',
    duracion_min: 120,
    precio: 800,
    orden: 7,
    reglas: { modalidad: 'a_distancia' }, // siempre a distancia, aunque sea viernes
  },
  {
    id: 'sanacion-para-animales',
    titulo: 'Sanación para Animales',
    descripcion: 'Sesión de sanación energética para tu compañero animal. Puede ser presencial, en línea o grabada; envía previamente su nombre, foto y el tema a trabajar.',
    duracion_min: 60,
    precio: 700,
    orden: 8,
  },
];

/** Inserta los que faltan; no pisa lo que el admin ya haya editado. */
export async function sembrarServicios() {
  let creados = 0;
  for (const s of SERVICIOS) {
    const [, creado] = await Servicio.findOrCreate({ where: { id: s.id }, defaults: { ...s, reglas: s.reglas ?? {} } });
    if (creado) creados++;
  }
  return { total: SERVICIOS.length, creados };
}
