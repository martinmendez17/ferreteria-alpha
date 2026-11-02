/** Error con código de estado HTTP que el manejador central convierte en respuesta JSON. */
export class HttpError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detalles?: unknown;

  constructor(status: number, mensaje: string, codigo = "ERROR", detalles?: unknown) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export const peticionInvalida = (mensaje: string, detalles?: unknown) =>
  new HttpError(400, mensaje, "PETICION_INVALIDA", detalles);
export const noAutenticado = (mensaje = "Debes iniciar sesión") => new HttpError(401, mensaje, "NO_AUTENTICADO");
export const sinPermiso = (mensaje = "No tienes permiso para esta acción") => new HttpError(403, mensaje, "SIN_PERMISO");
export const noEncontrado = (que: string) => new HttpError(404, `${que} no existe`, "NO_ENCONTRADO");
export const conflicto = (mensaje: string, detalles?: unknown) => new HttpError(409, mensaje, "CONFLICTO", detalles);
export const datosInvalidos = (mensaje: string, detalles?: unknown) =>
  new HttpError(422, mensaje, "DATOS_INVALIDOS", detalles);
