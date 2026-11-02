/*
 * Las fechas se guardan en UTC (así lo hace MongoDB) y se interpretan en la
 * hora de Chile. Por ejemplo, "hoy" empieza a las 00:00 de Santiago, que en
 * UTC son las 03:00 (o las 04:00 en invierno).
 */

export const ZONA_HORARIA = "America/Santiago";

const formato = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function partes(d: Date) {
  const p = Object.fromEntries(formato.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: Number(p["year"]), m: Number(p["month"]), d: Number(p["day"]), h: Number(p["hour"]), mi: Number(p["minute"]), s: Number(p["second"]) };
}

/** Minutos de diferencia entre la hora de Chile y UTC en ese instante (ej. -180). */
function desfase(instante: Date) {
  const p = partes(instante);
  const comoUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return Math.round((comoUtc - instante.getTime()) / 60000);
}

/** Convierte una fecha y hora de Chile al instante UTC correspondiente. */
export function horaChileAUtc(anio: number, mes: number, dia: number, hora = 0, minuto = 0): Date {
  const aproximado = Date.UTC(anio, mes - 1, dia, hora, minuto);
  let resultado = aproximado - desfase(new Date(aproximado)) * 60000;
  // Se recalcula una vez por si justo hay cambio de horario
  resultado = aproximado - desfase(new Date(resultado)) * 60000;
  return new Date(resultado);
}

/** Fecha de hoy en Chile como AAAA-MM-DD. */
export function hoyEnChile(base = new Date()): string {
  const p = partes(base);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Instante UTC en que empieza el día AAAA-MM-DD en Chile. */
export function inicioDelDia(fecha: string): Date {
  const [y, m, d] = fecha.split("-").map(Number) as [number, number, number];
  return horaChileAUtc(y, m, d);
}

/** Instante UTC en que empieza el día siguiente (límite exclusivo, se usa con $lt). */
export function finDelDia(fecha: string): Date {
  const [y, m, d] = fecha.split("-").map(Number) as [number, number, number];
  const siguiente = new Date(Date.UTC(y, m - 1, d + 1));
  return horaChileAUtc(siguiente.getUTCFullYear(), siguiente.getUTCMonth() + 1, siguiente.getUTCDate());
}

/** Resta días a una fecha AAAA-MM-DD. */
export function restarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d - dias)).toISOString().slice(0, 10);
}
