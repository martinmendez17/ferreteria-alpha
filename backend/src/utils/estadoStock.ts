export type EstadoStock = "sin_stock" | "critico" | "bajo" | "normal";

/**
 * Estado del stock que se muestra con colores en el panel (RF14):
 *  - sin_stock: no quedan unidades
 *  - critico:   stock en o bajo el mínimo (alerta)
 *  - bajo:      a menos de un 50 % por sobre el mínimo
 *  - normal:    el resto
 */
export function estadoStock(stockActual: number, stockMinimo: number): EstadoStock {
  if (stockActual === 0) return "sin_stock";
  if (stockActual <= stockMinimo) return "critico";
  if (stockActual <= Math.ceil(stockMinimo * 1.5)) return "bajo";
  return "normal";
}

/** Versión para el catálogo público, sin revelar los umbrales internos. */
export function disponibilidad(stockActual: number, stockMinimo: number) {
  const estado = estadoStock(stockActual, stockMinimo);
  if (estado === "sin_stock") return "sin_stock";
  if (estado === "critico") return "ultimas_unidades";
  return "disponible";
}
