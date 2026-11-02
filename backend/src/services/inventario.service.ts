import { prisma } from "../config/prisma";
import { estadoStock, type EstadoStock } from "../utils/estadoStock";

/** Tabla del panel de inventario con el estado de cada producto (RF14). */
export async function listarInventario(filtros: { texto?: string; estado?: EstadoStock }) {
  const productos = await prisma.producto.findMany({
    where: {
      estado: "activo",
      ...(filtros.texto && {
        OR: [
          { nombre: { contains: filtros.texto, mode: "insensitive" as const } },
          { sku: { contains: filtros.texto, mode: "insensitive" as const } },
        ],
      }),
    },
    include: { categoria: { select: { nombre: true } }, inventario: true },
    orderBy: { sku: "asc" },
  });

  const filas = productos.map((p) => {
    const stock = p.inventario?.stockActual ?? 0;
    return {
      idProducto: p.idProducto,
      sku: p.sku,
      nombre: p.nombre,
      categoria: p.categoria.nombre,
      stockActual: stock,
      stockMinimo: p.stockMinimo,
      estadoStock: estadoStock(stock, p.stockMinimo),
      ubicacionBodega: p.inventario?.ubicacionBodega ?? null,
      fechaActualizacion: p.inventario?.fechaActualizacion ?? null,
    };
  });
  return filtros.estado ? filas.filter((f) => f.estadoStock === filtros.estado) : filas;
}

/** Indicadores del panel: productos activos, en stock crítico y movimientos del día. */
export async function resumenInventario() {
  const inicioDelDia = new Date();
  inicioDelDia.setHours(0, 0, 0, 0);

  const [productosActivos, criticos, movimientosHoy] = await Promise.all([
    prisma.producto.count({ where: { estado: "activo" } }),
    productosEnStockCritico(),
    prisma.movimientoInventario.count({ where: { fechaHora: { gte: inicioDelDia } } }),
  ]);
  return { productosActivos, enStockCritico: criticos.length, movimientosHoy };
}

/**
 * RF14: productos en o bajo su stock mínimo.
 * Compara dos columnas de tablas distintas, por eso se usa SQL directo:
 * es la consulta C08 de database/03_consultas.sql, parametrizada por Prisma.
 */
export async function productosEnStockCritico() {
  return prisma.$queryRaw<
    { idProducto: number; sku: string; nombre: string; stockActual: number; stockMinimo: number; faltante: number }[]
  >`
    SELECT p.idProducto  AS "idProducto",
           p.sku,
           p.nombre,
           i.stockActual AS "stockActual",
           p.stockMinimo AS "stockMinimo",
           p.stockMinimo - i.stockActual AS faltante
    FROM   producto p
    JOIN   inventario i ON i.idProducto = p.idProducto
    WHERE  p.estado = 'activo'
      AND  i.stockActual <= p.stockMinimo
    ORDER  BY faltante DESC`;
}
