import type { Filter, ObjectId } from "mongodb";
import { cliente, col } from "../config/db";
import type { UsuarioAutenticado } from "../types/express";
import { MOTIVOS, type MovimientoDoc, type TipoMovimiento } from "../types/modelos";
import { estadoStock } from "../utils/estadoStock";
import { finDelDia, inicioDelDia } from "../utils/fechas";
import { datosInvalidos, HttpError, noEncontrado } from "../utils/httpError";
import { respuestaPaginada } from "../utils/validar";

export interface NuevoMovimiento {
  idProducto: ObjectId;
  tipoMovimiento: TipoMovimiento;
  cantidad: number;
  motivo: string;
}

/**
 * RF10, RF11, RF12, RF13 · RNF05, RNF06 · consultas C03 y C04.
 * Registra una entrada o salida siguiendo el diagrama de secuencia 5.2:
 *   1. Consulta el producto y su stock en la base de datos.
 *   2. Valida que el producto esté activo y que haya stock suficiente.
 *   3. Actualiza el stock y guarda el movimiento.
 * Todo ocurre en UNA transacción: si algo falla, no se guarda nada.
 */
export async function registrarMovimiento(m: NuevoMovimiento, usuario: UsuarioAutenticado) {
  if (!MOTIVOS[m.tipoMovimiento].includes(m.motivo)) {
    throw datosInvalidos(`El motivo de una ${m.tipoMovimiento} debe ser: ${MOTIVOS[m.tipoMovimiento].join(", ")}`, { campo: "motivo" });
  }

  const sesion = cliente.startSession();
  try {
    return await sesion.withTransaction(async () => {
      // 1. Consultar el stock actual en la base
      const producto = await col.productos.findOne({ _id: m.idProducto }, { session: sesion });
      if (!producto) throw noEncontrado("El producto");
      if (producto.estado !== "activo") {
        throw datosInvalidos("El producto está descontinuado: no se le pueden registrar movimientos", { campo: "idProducto" });
      }

      // 2. Validar: una salida no puede dejar el stock negativo (RF12)
      const stockAntes = producto.inventario.stockActual;
      if (m.tipoMovimiento === "salida" && m.cantidad > stockAntes) {
        throw new HttpError(
          422,
          `La cantidad supera el stock disponible (${stockAntes} ${stockAntes === 1 ? "unidad" : "unidades"})`,
          "STOCK_INSUFICIENTE",
          { campo: "cantidad", stockDisponible: stockAntes },
        );
      }

      // 3a. Actualizar el stock (C04). La condición $gte vuelve a revisar el stock en la
      //     misma operación, así dos salidas al mismo tiempo no lo dejan negativo.
      const delta = m.tipoMovimiento === "entrada" ? m.cantidad : -m.cantidad;
      const actualizado = await col.productos.findOneAndUpdate(
        {
          _id: m.idProducto,
          ...(m.tipoMovimiento === "salida" && { "inventario.stockActual": { $gte: m.cantidad } }),
        },
        { $inc: { "inventario.stockActual": delta }, $set: { "inventario.fechaActualizacion": new Date() } },
        { session: sesion, returnDocument: "after" },
      );
      if (!actualizado) {
        throw new HttpError(409, "El stock cambió mientras registrabas la salida. Revisa el stock e intenta de nuevo", "STOCK_CAMBIO");
      }
      const stockDespues = actualizado.inventario.stockActual;

      // 3b. Guardar el movimiento (C03) con la "foto" del producto y del usuario
      const movimiento: Omit<MovimientoDoc, "_id"> = {
        tipoMovimiento: m.tipoMovimiento,
        cantidad: m.cantidad,
        motivo: m.motivo,
        fechaHora: new Date(),
        stockResultante: stockDespues,
        producto: { _id: producto._id, sku: producto.sku, nombre: producto.nombre },
        usuario: { _id: usuario._id, nombreCompleto: usuario.nombreCompleto },
      };
      const { insertedId } = await col.movimientos.insertOne(movimiento as MovimientoDoc, { session: sesion });

      const estado = estadoStock(stockDespues, producto.stockMinimo);
      return {
        movimiento: { _id: insertedId, ...movimiento },
        producto: { _id: producto._id, nombre: producto.nombre, unidadMedida: producto.unidadMedida, stockMinimo: producto.stockMinimo },
        stockAnterior: stockAntes,
        stockActual: stockDespues,
        estadoStock: estado,
        alertaStockMinimo: estado !== "normal", // RF14
      };
    });
  } finally {
    await sesion.endSession();
  }
}

export interface FiltrosHistorial {
  idProducto?: ObjectId;
  tipo?: TipoMovimiento;
  desde?: string;
  hasta?: string;
  pagina: number;
  porPagina: number;
  saltar: number;
}

/**
 * RF13: historial (kardex) del más reciente al más antiguo.
 * No hace falta unir con productos ni usuarios: cada movimiento guarda su copia.
 */
export async function historial(f: FiltrosHistorial) {
  const filtro: Filter<MovimientoDoc> = {};
  if (f.idProducto) filtro["producto._id"] = f.idProducto;
  if (f.tipo) filtro.tipoMovimiento = f.tipo;
  if (f.desde || f.hasta) {
    filtro.fechaHora = {
      ...(f.desde ? { $gte: inicioDelDia(f.desde) } : {}),
      ...(f.hasta ? { $lt: finDelDia(f.hasta) } : {}),
    };
  }

  const [total, datos, totales] = await Promise.all([
    col.movimientos.countDocuments(filtro),
    col.movimientos.find(filtro).sort({ fechaHora: -1, _id: -1 }).skip(f.saltar).limit(f.porPagina).toArray(),
    // GROUP BY tipoMovimiento: suma de unidades que entraron y salieron en el período
    col.movimientos
      .aggregate<{ _id: TipoMovimiento; unidades: number; cantidad: number }>([
        { $match: filtro },
        { $group: { _id: "$tipoMovimiento", unidades: { $sum: "$cantidad" }, cantidad: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const suma = (t: TipoMovimiento) => totales.find((x) => x._id === t)?.unidades ?? 0;
  let producto = null;
  if (f.idProducto) {
    const p = await col.productos.findOne({ _id: f.idProducto });
    if (!p) throw noEncontrado("El producto");
    producto = {
      _id: p._id, sku: p.sku, nombre: p.nombre, unidadMedida: p.unidadMedida,
      stockActual: p.inventario.stockActual, stockMinimo: p.stockMinimo,
      estadoStock: estadoStock(p.inventario.stockActual, p.stockMinimo),
    };
  }

  return {
    ...respuestaPaginada(datos, total, f),
    resumen: { entradas: suma("entrada"), salidas: suma("salida"), producto },
  };
}
