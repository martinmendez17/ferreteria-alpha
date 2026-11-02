const ZONA = "America/Santiago";

const pesos = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const numeros = new Intl.NumberFormat("es-CL");

/** $8.990 */
export const dinero = (n: number) => pesos.format(n);
export const numero = (n: number) => numeros.format(n);

function partes(iso: string | Date) {
  const f = new Intl.DateTimeFormat("es-CL", {
    timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  return Object.fromEntries(f.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
}

/** 19-10-2026 · 11:42 */
export function fechaHora(iso: string | Date) {
  const p = partes(iso);
  return `${p["day"]}-${p["month"]}-${p["year"]} · ${p["hour"]}:${p["minute"]}`;
}

/** 19-10-2026 */
export function fecha(iso: string | Date) {
  const p = partes(iso);
  return `${p["day"]}-${p["month"]}-${p["year"]}`;
}

/** 11:42 */
export function hora(iso: string | Date) {
  const p = partes(iso);
  return `${p["hour"]}:${p["minute"]}`;
}

/** "2026-10-19" (fecha de un <input type="date">) -> "19-10-2026" */
export function diaIso(dia: string) {
  const [y, m, d] = dia.split("-");
  return `${d}-${m}-${y}`;
}

/** Fecha de hoy en Chile como AAAA-MM-DD (para los filtros de fecha). */
export function hoyIso(restarDias = 0) {
  const p = partes(new Date(Date.now() - restarDias * 86_400_000));
  return `${p["year"]}-${p["month"]}-${p["day"]}`;
}

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** "caja" -> "cajas" para los mensajes de confirmación. */
export function plural(cantidad: number, unidad: string) {
  if (cantidad === 1) return unidad;
  if (/[aeiouáéó]$/.test(unidad)) return unidad + "s";
  if (unidad.endsWith("ón")) return unidad.slice(0, -2) + "ones";
  return unidad + "es";
}
