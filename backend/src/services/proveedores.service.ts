import type { ObjectId } from "mongodb";
import { cliente, COLACION_ES, col } from "../config/db";
import { conflicto, noEncontrado } from "../utils/httpError";

export interface DatosProveedor {
  razonSocial?: string;
  telefono?: string | null;
  email?: string | null;
}

/** Proveedores con la cantidad de productos que surten ($lookup = JOIN). */
export async function listarProveedores() {
  return col.proveedores
    .aggregate([
      {
        $lookup: {
          from: "productos",
          localField: "_id",
          foreignField: "proveedor._id",
          pipeline: [{ $project: { _id: 1 } }],
          as: "productos",
        },
      },
      { $addFields: { productosTotal: { $size: "$productos" } } },
      { $project: { productos: 0 } },
      { $sort: { razonSocial: 1 } },
    ], { collation: COLACION_ES })
    .toArray();
}

export async function crearProveedor(d: Required<Pick<DatosProveedor, "razonSocial">> & DatosProveedor) {
  const doc = { razonSocial: d.razonSocial, telefono: d.telefono ?? null, email: d.email ?? null };
  const { insertedId } = await col.proveedores.insertOne(doc as never);
  return { _id: insertedId, ...doc, productosTotal: 0 };
}

/** Si cambia la razón social, se actualiza la copia que guardan los productos (en una transacción). */
export async function actualizarProveedor(id: ObjectId, d: DatosProveedor) {
  const sesion = cliente.startSession();
  try {
    await sesion.withTransaction(async () => {
      const r = await col.proveedores.updateOne({ _id: id }, { $set: d }, { session: sesion });
      if (r.matchedCount === 0) throw noEncontrado("El proveedor");
      if (d.razonSocial) {
        await col.productos.updateMany(
          { "proveedor._id": id },
          { $set: { "proveedor.razonSocial": d.razonSocial } },
          { session: sesion },
        );
      }
    });
  } finally {
    await sesion.endSession();
  }
  return col.proveedores.findOne({ _id: id });
}

/** RF15 · consulta C10: solo se elimina un proveedor sin productos asociados. */
export async function eliminarProveedor(id: ObjectId) {
  const proveedor = await col.proveedores.findOne({ _id: id });
  if (!proveedor) throw noEncontrado("El proveedor");
  const usados = await col.productos.countDocuments({ "proveedor._id": id });
  if (usados > 0) {
    throw conflicto(
      `No se puede eliminar “${proveedor.razonSocial}”: surte ${usados} producto(s). Primero asígnales otro proveedor`,
      { productos: usados },
    );
  }
  await col.proveedores.deleteOne({ _id: id });
}
