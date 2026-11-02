/** Error con código de estado HTTP que el manejador central convierte en respuesta JSON. */
export class HttpError extends Error {
  readonly status: number;
  readonly detalles?: unknown;

  constructor(status: number, mensaje: string, detalles?: unknown) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

export const noEncontrado = (que: string) => new HttpError(404, `${que} no existe`);
export const datosInvalidos = (mensaje: string, detalles?: unknown) => new HttpError(422, mensaje, detalles);
export const conflicto = (mensaje: string) => new HttpError(409, mensaje);
