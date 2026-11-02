import { prisma } from "../config/prisma";
import { estadoStock } from "../utils/estadoStock";
import { datosInvalidos, noEncontrado } from "../utils/httpError";

export const TIPOS_MOVIMIENTO = ["entrada", "salida"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export interface NuevoMovimiento {
  idProducto: number;
  tipoMovimiento: TipoMovimiento;
  cantidad: number;
  motivo: string;
}

/**
 * RF10, RF11, RF12, RF13 · RNF05, RNF06
 * Registra una entrada o salida. El movimiento y la actualización del stock
 * se ejecutan en UNA transacción: si algo falla, no se guarda nada.
 */
export async function registrarMovimiento(m: NuevoMovimiento, idUsuario: number) {
  const producto = await prisma.producto.findUnique({
    where: { idProducto: m.idProducto },
    include: { inventario: true },
  });
  if (!producto || !producto.inventario) throw noEncontrado("El producto");
  if (producto.estado !== "activo") throw datosInvalidos("El producto está descontinuado");

  return prisma.$transaction(async (tx) => {
    if (m.tipoMovimiento === "salida") {
      // La condición stockActual >= cantidad se evalúa en la misma sentencia UPDATE,
      // así dos salidas simultáneas no pueden dejar el stock negativo (RF12).
      const resultado = await tx.inventario.updateMany({
        where: { idProducto: m.idProducto, stockActual: { gte: m.cantidad } },
        data: { stockActual: { decrement: m.cantidad }, fechaActualizacion: new Date() },
      });
      if (resultado.count === 0) {
        const disponible = producto.inventario?.stockActual ?? 0;
        throw datosInvalidos(`Stock insuficiente: hay ${disponible} unidad(es) disponibles`, { stockDisponible: disponible });
      }
    } else {
      await tx.inventario.update({
        where: { idProducto: m.idProducto },
        data: { stockActual: { increment: m.cantidad }, fechaActualizacion: new Date() },
      });
    }

    const movimiento = await tx.movimientoInventario.create({
      data: {
        idProducto: m.idProducto,
        idUsuario,
        tipoMovimiento: m.tipoMovimiento,
        cantidad: m.cantidad,
        motivo: m.motivo,
      },
    });

    const inventario = await tx.inventario.findUniqueOrThrow({ where: { idProducto: m.idProducto } });
    const estado = estadoStock(inventario.stockActual, producto.stockMinimo);
    return {
      movimiento,
      stockActual: inventario.stockActual,
      estadoStock: estado,
      alertaStockMinimo: estado === "critico" || estado === "sin_stock", // RF14
    };
  });
}

/** RF13: historial (kardex) con el usuario responsable de cada movimiento. */
export async function historial(filtros: { idProducto?: number; limite: number }) {
  const movimientos = await prisma.movimientoInventario.findMany({
    where: filtros.idProducto ? { idProducto: filtros.idProducto } : {},
    include: {
      producto: { select: { sku: true, nombre: true } },
      usuario: { select: { nombreCompleto: true } },
    },
    orderBy: { fechaHora: "desc" },
    take: filtros.limite,
  });
  return movimientos.map((m) => ({
    idMovimiento: m.idMovimiento,
    fechaHora: m.fechaHora,
    sku: m.producto.sku,
    producto: m.producto.nombre,
    tipoMovimiento: m.tipoMovimiento,
    cantidad: m.cantidad,
    motivo: m.motivo,
    usuario: m.usuario.nombreCompleto,
  }));
}
