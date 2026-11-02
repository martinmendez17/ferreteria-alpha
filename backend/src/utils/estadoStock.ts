/*
 * Estados del stock (RF14). Definición formal, la misma en todo el sistema:
 *
 *   Panel interno           Catálogo público      Condición
 *   ---------------------   -------------------   ------------------------------------
 *   "normal"                "disponible"          stockActual >  stockMinimo
 *   "critico"               "ultimas_unidades"    0 < stockActual <= stockMinimo
 *   "sin_stock"             "sin_stock"           stockActual = 0
 *
 * El catálogo usa otros nombres para no mostrar al cliente los umbrales internos.
 */

export const ESTADOS_STOCK = ["sin_stock", "critico", "normal"] as const;
export type EstadoStock = (typeof ESTADOS_STOCK)[number];

export function estadoStock(stockActual: number, stockMinimo: number): EstadoStock {
  if (stockActual <= 0) return "sin_stock";
  if (stockActual <= stockMinimo) return "critico";
  return "normal";
}

export function disponibilidad(stockActual: number, stockMinimo: number) {
  const estado = estadoStock(stockActual, stockMinimo);
  if (estado === "sin_stock") return "sin_stock";
  if (estado === "critico") return "ultimas_unidades";
  return "disponible";
}

/** La misma regla escrita como expresión de agregación de MongoDB ($switch). */
export const expresionEstadoStock = {
  $switch: {
    branches: [
      { case: { $lte: ["$inventario.stockActual", 0] }, then: "sin_stock" },
      { case: { $lte: ["$inventario.stockActual", "$stockMinimo"] }, then: "critico" },
    ],
    default: "normal",
  },
};
