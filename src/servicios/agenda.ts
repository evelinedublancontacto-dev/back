/* ------------------------------------------------------------------ *
 *  src/servicios/agenda.ts
 *  Cálculo de disponibilidad como función pura: recibe datos, devuelve
 *  bloques. Sin base de datos, para poder probar cada regla por separado.
 * ------------------------------------------------------------------ */

import { aMinutos, deMinutos, diaSemana } from './fechas';
import type { ReglasServicio } from '../modelos/Servicio';
import type { Modalidad } from '../modelos/Horario';

export const INTERVALO_MIN = 60;

export type VentanaHorario = { hora_inicio: string; hora_fin: string; modalidad?: Modalidad };
export type RangoBloqueo = { hora_inicio: string | null; hora_fin: string | null };
export type Bloque = { hora: string; disponible: boolean };

export type EntradaDisponibilidad = {
  fecha: string;
  horarios: VentanaHorario[];
  bloqueos: RangoBloqueo[];
  horasOcupadas: string[];
  reglas?: ReglasServicio;
  intervaloMin?: number;
  /** Si la fecha es hoy, se descartan las horas que ya pasaron. */
  ahora?: { fecha: string; hora: string };
};

/** Lo que ve el visitante: la del día (horarios) o la fija del servicio. */
export type ModalidadAtencion = Modalidad | 'a_distancia';

export type SalidaDisponibilidad = {
  fecha: string;
  slots: Bloque[];
  disponible: boolean;
  /** Cómo se atiende. Falta cuando el día no tiene ventanas y el servicio no la fija. */
  modalidad?: ModalidadAtencion;
  mensaje?: string;
};

/** Los horarios de una fecha concreta sustituyen a los de la semana: son la
 *  excepción (el puente, el día que se trabaja en la mañana en vez de la tarde).
 *  Sin excepciones para esa fecha, rige la semana de siempre. */
export function ventanasDelDia(semanales: VentanaHorario[], deLaFecha: VentanaHorario[]): VentanaHorario[] {
  return deLaFecha.length > 0 ? deLaFecha : semanales;
}

/** La modalidad es del día: si alguna ventana es presencial, el día lo es. */
export function modalidadDelDia(horarios: VentanaHorario[]): Modalidad | undefined {
  if (horarios.length === 0) return undefined;
  return horarios.some((h) => h.modalidad === 'presencial') ? 'presencial' : 'en_linea';
}

/** Un servicio con modalidad fija (p. ej. velas, siempre a distancia) gana al día. */
export function modalidadAtencion(horarios: VentanaHorario[], reglas?: ReglasServicio): ModalidadAtencion | undefined {
  const fija = reglas?.modalidad;
  if (fija === 'presencial' || fija === 'en_linea' || fija === 'a_distancia') return fija;
  return modalidadDelDia(horarios);
}

export function generarBloques(horarios: VentanaHorario[], intervaloMin = INTERVALO_MIN): string[] {
  const bloques = new Set<string>();
  for (const h of horarios) {
    const fin = aMinutos(h.hora_fin);
    for (let t = aMinutos(h.hora_inicio); t + intervaloMin <= fin; t += intervaloMin) {
      bloques.add(deMinutos(t));
    }
  }
  return [...bloques].sort();
}

function bloqueadoPor(hora: string, intervaloMin: number, bloqueos: RangoBloqueo[]): boolean {
  const inicio = aMinutos(hora);
  const fin = inicio + intervaloMin;
  return bloqueos.some((b) => {
    if (b.hora_inicio === null || b.hora_fin === null) return true; // día completo
    return inicio < aMinutos(b.hora_fin) && fin > aMinutos(b.hora_inicio); // se traslapan
  });
}

export function calcularDisponibilidad(e: EntradaDisponibilidad): SalidaDisponibilidad {
  const intervalo = e.intervaloMin ?? INTERVALO_MIN;
  const dia = diaSemana(e.fecha);
  const modalidad = modalidadAtencion(e.horarios, e.reglas);

  const permitidos = e.reglas?.dias_permitidos;
  if (permitidos && permitidos.length > 0 && !permitidos.includes(dia)) {
    return {
      fecha: e.fecha,
      slots: [],
      disponible: false,
      modalidad,
      mensaje: e.reglas?.mensaje_dias ?? 'Este servicio no se agenda ese día.',
    };
  }

  if (e.bloqueos.some((b) => b.hora_inicio === null)) {
    return { fecha: e.fecha, slots: [], disponible: false, modalidad, mensaje: 'Ese día no hay atención.' };
  }

  const ocupadas = new Set(e.horasOcupadas);
  const yaPaso = (hora: string) => e.ahora !== undefined && e.ahora.fecha === e.fecha && aMinutos(hora) <= aMinutos(e.ahora.hora);

  const slots: Bloque[] = generarBloques(e.horarios, intervalo)
    .filter((hora) => !bloqueadoPor(hora, intervalo, e.bloqueos) && !yaPaso(hora))
    .map((hora) => ({ hora, disponible: !ocupadas.has(hora) }));

  return {
    fecha: e.fecha,
    slots,
    disponible: slots.some((s) => s.disponible),
    modalidad,
  };
}
