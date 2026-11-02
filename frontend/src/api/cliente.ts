/*
 * Cliente de la API REST. Todas las pantallas llaman a la API a través de
 * esta función: agrega el token, arma la URL y convierte los errores en
 * un ErrorApi con el mensaje que envía el servidor.
 */

export const URL_API = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").replace(/\/$/, "");

export class ErrorApi extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detalles: Record<string, unknown>;

  constructor(status: number, mensaje: string, codigo = "ERROR", detalles: Record<string, unknown> = {}) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }

  /** Nombre del campo con error, si el servidor lo indicó (para marcarlo en el formulario). */
  get campo(): string | undefined {
    return typeof this.detalles["campo"] === "string" ? (this.detalles["campo"] as string) : undefined;
  }
}

let token: string | null = null;
let alExpirarSesion: ((mensaje: string) => void) | null = null;

export function configurarSesion(nuevoToken: string | null, alExpirar?: (mensaje: string) => void) {
  token = nuevoToken;
  if (alExpirar) alExpirarSesion = alExpirar;
}

type Valor = string | number | boolean | undefined | null;

interface Opciones {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  cuerpo?: unknown;
  consulta?: Record<string, Valor>;
  signal?: AbortSignal;
}

export async function api<T>(ruta: string, { metodo = "GET", cuerpo, consulta, signal }: Opciones = {}): Promise<T> {
  const url = new URL(URL_API + ruta);
  for (const [clave, valor] of Object.entries(consulta ?? {})) {
    if (valor !== undefined && valor !== null && valor !== "") url.searchParams.set(clave, String(valor));
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ErrorApi(
      0,
      "No se pudo conectar con el servidor. Revisa tu conexión; si la página recién se abrió, el servidor puede tardar unos segundos en despertar.",
      "SIN_CONEXION",
    );
  }

  if (respuesta.status === 204) return undefined as T;
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const mensaje = datos.error ?? `Error ${respuesta.status}`;
    // Sesión vencida o cuenta desactivada: se cierra la sesión en el navegador
    if (respuesta.status === 401 && token && !ruta.startsWith("/auth/login")) alExpirarSesion?.(mensaje);
    throw new ErrorApi(respuesta.status, mensaje, datos.codigo, datos.detalles ?? {});
  }
  return datos as T;
}

/** Mensaje legible de cualquier error. */
export function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorApi) return e.message;
  if (e instanceof Error) return e.message;
  return "Ocurrió un error inesperado";
}
