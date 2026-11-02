import { ObjectId } from "mongodb";

/*
 * Convierte el filtro o la agregación que ejecuta el servidor en el texto
 * que se escribiría en la consola de MongoDB (mongosh). La pantalla de
 * reportes muestra este texto, así lo que se presenta es exactamente la
 * consulta que se ejecutó.
 */

const IDENTIFICADOR = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function aShell(valor: unknown, sangria = 0): string {
  const esp = "  ".repeat(sangria);
  const espDentro = "  ".repeat(sangria + 1);

  if (valor === null) return "null";
  if (valor === undefined) return "undefined";
  if (valor instanceof ObjectId) return `ObjectId("${valor.toHexString()}")`;
  if (valor instanceof Date) return `ISODate("${valor.toISOString()}")`;
  if (valor instanceof RegExp) return valor.toString();
  if (typeof valor === "string") return JSON.stringify(valor);
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);

  if (Array.isArray(valor)) {
    if (valor.length === 0) return "[]";
    const simples = valor.every((v) => v === null || ["string", "number", "boolean"].includes(typeof v));
    const enLinea = `[${valor.map((v) => aShell(v, 0)).join(", ")}]`;
    if (simples && enLinea.length <= 70) return enLinea;
    return `[\n${valor.map((v) => espDentro + aShell(v, sangria + 1)).join(",\n")}\n${esp}]`;
  }

  if (typeof valor === "object") {
    const entradas = Object.entries(valor as Record<string, unknown>).filter(([, v]) => v !== undefined);
    if (entradas.length === 0) return "{}";
    const clave = (k: string) => (IDENTIFICADOR.test(k) ? k : JSON.stringify(k));
    const enLinea = `{ ${entradas.map(([k, v]) => `${clave(k)}: ${aShell(v, 0)}`).join(", ")} }`;
    if (enLinea.length <= 70 && !enLinea.includes("\n")) return enLinea;
    return `{\n${entradas.map(([k, v]) => `${espDentro}${clave(k)}: ${aShell(v, sangria + 1)}`).join(",\n")}\n${esp}}`;
  }
  return String(valor);
}

export function textoAgregacion(coleccion: string, pipeline: object[]) {
  return `db.${coleccion}.aggregate(${aShell(pipeline)})`;
}
