import { ObjectId } from "mongodb";
import { datosInvalidos, peticionInvalida } from "./httpError";

/*
 * Validaciones de los datos que llegan en la petición.
 * Si algo está mal se responde 422 con el nombre del campo, para que el
 * frontend pueda mostrar el error junto al campo correspondiente.
 */

const invalido = (campo: string, mensaje: string) => datosInvalidos(mensaje, { campo });

export function texto(valor: unknown, campo: string, max: number, opcional = false): string | undefined {
  if (valor === undefined || valor === null || (typeof valor === "string" && valor.trim() === "")) {
    if (opcional) return undefined;
    throw invalido(campo, `El campo "${campo}" es obligatorio`);
  }
  if (typeof valor !== "string") throw invalido(campo, `El campo "${campo}" debe ser texto`);
  const limpio = valor.trim();
  if (limpio.length > max) throw invalido(campo, `El campo "${campo}" admite como máximo ${max} caracteres`);
  return limpio;
}

export function textoObligatorio(valor: unknown, campo: string, max: number): string {
  return texto(valor, campo, max) as string;
}

export function entero(valor: unknown, campo: string, { min = 0, max = Number.MAX_SAFE_INTEGER, opcional = false } = {}) {
  if (valor === undefined || valor === null || valor === "") {
    if (opcional) return undefined;
    throw invalido(campo, `El campo "${campo}" es obligatorio`);
  }
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw invalido(campo, `El campo "${campo}" debe ser un número entero entre ${min} y ${max}`);
  }
  return n;
}

export function enteroObligatorio(valor: unknown, campo: string, min = 0, max?: number): number {
  return entero(valor, campo, { min, max }) as number;
}

export function opcion<T extends string>(valor: unknown, campo: string, permitidos: readonly T[]): T {
  if (typeof valor !== "string" || !permitidos.includes(valor as T)) {
    throw invalido(campo, `El campo "${campo}" debe ser uno de: ${permitidos.join(", ")}`);
  }
  return valor as T;
}

export function opcionOpcional<T extends string>(valor: unknown, campo: string, permitidos: readonly T[]) {
  if (valor === undefined || valor === "") return undefined;
  return opcion(valor, campo, permitidos);
}

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function email(valor: unknown, campo = "email"): string {
  const e = textoObligatorio(valor, campo, 150).toLowerCase();
  if (!REGEX_EMAIL.test(e)) throw invalido(campo, "El correo electrónico no tiene un formato válido");
  return e;
}

/** Contraseña: al menos 8 caracteres, con letras y números. */
export function contrasenaNueva(valor: unknown, campo = "password"): string {
  if (typeof valor !== "string" || valor.length === 0) throw invalido(campo, "La contraseña es obligatoria");
  if (valor.length < 8 || valor.length > 72 || !/[A-Za-z]/.test(valor) || !/\d/.test(valor)) {
    throw invalido(campo, "La contraseña debe tener entre 8 y 72 caracteres, con letras y números");
  }
  return valor;
}

/** URL de imagen: http(s) o una ruta que empieza con "/" (imágenes del propio frontend). */
export function urlImagen(valor: unknown, campo = "imagenUrl"): string | null | undefined {
  if (valor === null) return null;
  const url = texto(valor, campo, 500, true);
  if (url === undefined) return undefined;
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return url;
  } catch {
    /* sigue abajo */
  }
  throw invalido(campo, "La imagen debe ser un enlace que empiece con https:// (o una ruta /img/...)");
}

export function listaDeTextos(valor: unknown, campo: string, maxElementos = 15): string[] | undefined {
  if (valor === undefined) return undefined;
  const lista = typeof valor === "string" ? valor.split(",") : valor;
  if (!Array.isArray(lista)) throw invalido(campo, `El campo "${campo}" debe ser una lista de palabras`);
  const limpia = [...new Set(lista.map((v) => String(v).trim().toLowerCase()).filter(Boolean))];
  if (limpia.length > maxElementos) throw invalido(campo, `El campo "${campo}" admite como máximo ${maxElementos} palabras`);
  return limpia;
}

/** Convierte un texto en ObjectId. Para ids de la URL un id mal formado es 400. */
export function idDeRuta(valor: unknown, que = "id"): ObjectId {
  if (typeof valor !== "string" || !ObjectId.isValid(valor) || valor.length !== 24) {
    throw peticionInvalida(`El ${que} "${String(valor)}" no tiene un formato válido`);
  }
  return new ObjectId(valor);
}

/** ObjectId que viene en el cuerpo o en la consulta (?categoria=...). */
export function idDeCampo(valor: unknown, campo: string, opcional: true): ObjectId | undefined;
export function idDeCampo(valor: unknown, campo: string, opcional?: false): ObjectId;
export function idDeCampo(valor: unknown, campo: string, opcional = false): ObjectId | undefined {
  if (valor === undefined || valor === null || valor === "") {
    if (opcional) return undefined;
    throw invalido(campo, `El campo "${campo}" es obligatorio`);
  }
  if (typeof valor !== "string" || valor.length !== 24 || !ObjectId.isValid(valor)) {
    throw invalido(campo, `El campo "${campo}" no es un id válido`);
  }
  return new ObjectId(valor);
}

/** Lista de ids separada por comas: ?categorias=id1,id2 */
export function listaDeIds(valor: unknown, campo: string): ObjectId[] | undefined {
  if (valor === undefined || valor === "") return undefined;
  if (typeof valor !== "string") throw peticionInvalida(`El parámetro "${campo}" no es válido`);
  return valor.split(",").filter(Boolean).map((v) => idDeCampo(v, campo));
}

/** Fecha en formato AAAA-MM-DD (la que entrega un <input type="date">). */
export function fechaIso(valor: unknown, campo: string): string | undefined {
  if (valor === undefined || valor === "") return undefined;
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw peticionInvalida(`El parámetro "${campo}" debe ser una fecha AAAA-MM-DD`);
  }
  return valor;
}

/** Escapa un texto para usarlo dentro de una expresión regular de búsqueda. */
export function escaparRegex(t: string) {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Paginación común: ?pagina=1&porPagina=20 */
export function paginacion(q: Record<string, unknown>, porDefecto = 20, maximo = 100) {
  const pagina = entero(q["pagina"], "pagina", { min: 1, opcional: true }) ?? 1;
  const porPagina = entero(q["porPagina"], "porPagina", { min: 1, max: maximo, opcional: true }) ?? porDefecto;
  return { pagina, porPagina, saltar: (pagina - 1) * porPagina };
}

export function respuestaPaginada<T>(datos: T[], total: number, p: { pagina: number; porPagina: number }) {
  return { datos, total, pagina: p.pagina, porPagina: p.porPagina, totalPaginas: Math.max(1, Math.ceil(total / p.porPagina)) };
}
