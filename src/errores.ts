/* Error con estatus HTTP y código estable para el front. */
export class ErrorHttp extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorHttp';
  }
}
