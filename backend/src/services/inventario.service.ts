import type { Document, Filter, ObjectId } from "mongodb";
import { COLACION_ES, col } from "../config/db";
import type { ProductoDoc } from "../types/modelos";
import { type EstadoStock, expresionEstadoStock } from "../utils/estadoStock";
import { hoyEnChile, inicioDelDia } from "../utils/fechas";
import { respuestaPaginada } from "../utils/validar";
import { filtroTexto } from "./productos.service";

/**
 * RF14: tabla del panel de inventario. Los productos que requieren atención
 * (sin stock y crítico) aparecen primero, como en el boceto del panel.
 * El estado se calcula en la base con $switch y se ordena por prioridad.
 */
export async function listarInventario(f: {
  texto?: string;
  idCategoria?: ObjectId;
  estado?: EstadoStock;
  pagina: number;
  porPagina: number;
  saltar: number;
}) {
  const filtro: Filter<ProductoDoc> = { estado: "activo" };
  if (f.texto) Object.assign(filtro, filtroTexto(f.texto));
  if (f.idCategoria) filtro["categoria._id"] = f.idCategoria;

  const pipeline: Document[] = [
    { $match: filtro },
    { $addFields: { estadoStock: expresionEstadoStock } },
    ...(f.estado ? [{ $match: { estadoStock: f.estado } }] : []),
    { $addFields: { prioridad: { $indexOfArray: [["sin_stock", "critico", "normal"], "$estadoStock"] } } },
    { $sort: { prioridad: 1, nombre: 1 } },
    {
      $facet: {
        datos: [
          { $skip: f.saltar },
          { $limit: f.porPagina },
          {
            $project: {
              sku: 1, nombre: 1, marca: 1, unidadMedida: 1, stockMinimo: 1, estadoStock: 1,
              categoria: 1, inventario: 1, imagenUrl: 1,
            },
          },
        ],
        total: [{ $count: "n" }],
      },
    },
  ];
  const [resultado] = await col.productos.aggregate(pipeline, { collation: COLACION_ES }).toArray();
  return respuestaPaginada(resultado?.["datos"] ?? [], resultado?.["total"]?.[0]?.n ?? 0, f);
}

/** Indicadores del panel: productos activos, en stock crítico o sin stock, y movimientos de hoy. */
export async function resumenInventario() {
  const [productosActivos, enStockCritico, movimientosHoy] = await Promise.all([
    col.productos.countDocuments({ estado: "activo" }),
    col.productos.countDocuments({ estado: "activo", $expr: { $lte: ["$inventario.stockActual", "$stockMinimo"] } }),
    col.movimientos.countDocuments({ fechaHora: { $gte: inicioDelDia(hoyEnChile()) } }),
  ]);
  return { productosActivos, enStockCritico, movimientosHoy };
}

/**
 * RF14 · consulta C08 traducida: productos en o bajo su stock mínimo.
 * En SQL comparaba dos columnas de tablas distintas (JOIN); aquí ambos
 * campos están en el mismo documento y se comparan con $expr.
 */
export async function productosEnStockCritico() {
  return col.productos
    .aggregate([
      { $match: { estado: "activo", $expr: { $lte: ["$inventario.stockActual", "$stockMinimo"] } } },
      {
        $project: {
          sku: 1,
          nombre: 1,
          stockActual: "$inventario.stockActual",
          stockMinimo: 1,
          faltante: { $subtract: ["$stockMinimo", "$inventario.stockActual"] },
          proveedor: 1,
        },
      },
      { $sort: { faltante: -1 } },
    ])
    .toArray();
}
