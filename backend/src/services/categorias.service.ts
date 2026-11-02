import type { ObjectId } from "mongodb";
import { cliente, COLACION_ES, col } from "../config/db";
import { conflicto, noEncontrado } from "../utils/httpError";

/**
 * RF03 y RF15: categorías con la cantidad de productos de cada una.
 * $lookup es el JOIN de MongoDB: une cada categoría con sus productos.
 */
export async function listarCategorias() {
  return col.categorias
    .aggregate([
      {
        $lookup: {
          from: "productos",
          localField: "_id",
          foreignField: "categoria._id",
          pipeline: [{ $project: { estado: 1 } }],
          as: "productos",
        },
      },
      {
        $project: {
          nombre: 1,
          descripcion: 1,
          productosTotal: { $size: "$productos" },
          productosActivos: {
            $size: { $filter: { input: "$productos", cond: { $eq: ["$$this.estado", "activo"] } } },
          },
        },
      },
      { $sort: { nombre: 1 } },
    ], { collation: COLACION_ES })
    .toArray();
}

export async function crearCategoria(nombre: string, descripcion?: string | null) {
  const { insertedId } = await col.categorias.insertOne({ nombre, descripcion: descripcion ?? null } as never);
  return { _id: insertedId, nombre, descripcion: descripcion ?? null, productosTotal: 0, productosActivos: 0 };
}

/**
 * Cambiar el nombre de una categoría: como el nombre está copiado en cada
 * producto (referencia extendida), se actualizan todos con updateMany.
 * Las dos escrituras van en una transacción: o se hacen ambas o ninguna.
 */
export async function actualizarCategoria(id: ObjectId, datos: { nombre?: string; descripcion?: string | null }) {
  const sesion = cliente.startSession();
  try {
    await sesion.withTransaction(async () => {
      const r = await col.categorias.updateOne({ _id: id }, { $set: datos }, { session: sesion });
      if (r.matchedCount === 0) throw noEncontrado("La categoría");
      if (datos.nombre) {
        await col.productos.updateMany({ "categoria._id": id }, { $set: { "categoria.nombre": datos.nombre } }, { session: sesion });
      }
    });
  } finally {
    await sesion.endSession();
  }
  return col.categorias.findOne({ _id: id });
}

/** RF15 · consulta C09: solo se elimina si ningún producto la usa (equivale a ON DELETE RESTRICT). */
export async function eliminarCategoria(id: ObjectId) {
  const categoria = await col.categorias.findOne({ _id: id });
  if (!categoria) throw noEncontrado("La categoría");
  const usados = await col.productos.countDocuments({ "categoria._id": id });
  if (usados > 0) {
    throw conflicto(
      `No se puede eliminar “${categoria.nombre}”: tiene ${usados} producto(s). Primero cámbialos de categoría`,
      { productos: usados },
    );
  }
  await col.categorias.deleteOne({ _id: id });
}
