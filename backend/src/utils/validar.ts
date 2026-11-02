import { datosInvalidos } from "./httpError";

/** Validaciones simples de datos de entrada. Lanzan 422 con un mensaje claro. */

export function texto(valor: unknown, campo: string, max: number, opcional = false): string | undefined {
  if (valor === undefined || valor === null || valor === "") {
    if (opcional) return undefined;
    throw datosInvalidos(`El campo "${campo}" es obligatorio`);
  }
  if (typeof valor !== "string") throw datosInvalidos(`El campo "${campo}" debe ser texto`);
  const limpio = valor.trim();
  if (!opcional && limpio.length === 0) throw datosInvalidos(`El campo "${campo}" es obligatorio`);
  if (limpio.length > max) throw datosInvalidos(`El campo "${campo}" admite como máximo ${max} caracteres`);
  return limpio;
}

export function textoObligatorio(valor: unknown, campo: string, max: number): string {
  return texto(valor, campo, max) as string;
}

export function entero(valor: unknown, campo: string, { min = 0, opcional = false } = {}): number | undefined {
  if (valor === undefined || valor === null || valor === "") {
    if (opcional) return undefined;
    throw datosInvalidos(`El campo "${campo}" es obligatorio`);
  }
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min) {
    throw datosInvalidos(`El campo "${campo}" debe ser un número entero mayor o igual a ${min}`);
  }
  return n;
}

export function enteroObligatorio(valor: unknown, campo: string, min = 0): number {
  return entero(valor, campo, { min }) as number;
}

export function numero(valor: unknown, campo: string, min = 0): number {
  const n = Number(valor);
  if (valor === undefined || valor === null || valor === "" || !Number.isFinite(n) || n < min) {
    throw datosInvalidos(`El campo "${campo}" debe ser un número mayor o igual a ${min}`);
  }
  return n;
}

export function opcion<T extends string>(valor: unknown, campo: string, permitidos: readonly T[]): T {
  if (typeof valor !== "string" || !permitidos.includes(valor as T)) {
    throw datosInvalidos(`El campo "${campo}" debe ser uno de: ${permitidos.join(", ")}`);
  }
  return valor as T;
}

/** Lee un parámetro de ruta :id como entero positivo. */
export function idDeRuta(valor: unknown, que = "id"): number {
  return enteroObligatorio(valor, que, 1);
}
