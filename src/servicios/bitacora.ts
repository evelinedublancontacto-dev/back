import { Bitacora, type Usuario } from '../modelos';

export type Actor = { usuario: Usuario | null; ip: string };

/** Registra un cambio. Nunca lanza: un fallo de bitácora no debe tumbar
    la operación que la origina, pero sí se ve en los logs. */
export async function registrar(
  actor: Actor,
  accion: 'crear' | 'actualizar' | 'borrar' | 'entrar' | 'salir',
  entidad: string,
  entidad_id: string,
  antes: object | null = null,
  despues: object | null = null,
) {
  try {
    await Bitacora.create({
      actor_id: actor.usuario?.id ?? null,
      actor_correo: actor.usuario?.correo ?? 'sistema',
      accion,
      entidad,
      entidad_id,
      antes,
      despues,
      ip: actor.ip,
    });
  } catch (error) {
    console.error('[bitacora] no se pudo registrar', accion, entidad, entidad_id, error);
  }
}
