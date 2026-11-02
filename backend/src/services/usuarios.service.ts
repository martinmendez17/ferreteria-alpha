import bcrypt from "bcryptjs";
import type { ObjectId } from "mongodb";
import { COLACION_ES, col } from "../config/db";
import type { UsuarioAutenticado } from "../types/express";
import type { Rol, UsuarioDoc } from "../types/modelos";
import { conflicto, noEncontrado } from "../utils/httpError";

/** Nunca se envían la contraseña cifrada ni el token de recuperación. */
const SIN_SECRETOS = { passwordHash: 0, recuperacion: 0 } as const;

/** RF16: gestión de cuentas por el Administrador. Incluye cuántos movimientos registró cada uno. */
export async function listarUsuarios() {
  return col.usuarios
    .aggregate([
      { $project: SIN_SECRETOS },
      {
        $lookup: {
          from: "movimientos",
          localField: "_id",
          foreignField: "usuario._id",
          pipeline: [{ $count: "n" }],
          as: "conteo",
        },
      },
      { $addFields: { movimientos: { $ifNull: [{ $first: "$conteo.n" }, 0] } } },
      { $project: { conteo: 0 } },
      { $sort: { estado: 1, nombreCompleto: 1 } },
    ], { collation: COLACION_ES })
    .toArray();
}

export async function crearUsuario(d: { nombreCompleto: string; email: string; password: string; rol: Rol }) {
  const doc: Omit<UsuarioDoc, "_id"> = {
    nombreCompleto: d.nombreCompleto,
    email: d.email,
    passwordHash: await bcrypt.hash(d.password, 10), // RNF01: nunca se guarda en texto plano
    rol: d.rol,
    estado: "activo",
    fechaCreacion: new Date(),
    ultimoAcceso: null,
  };
  const { insertedId } = await col.usuarios.insertOne(doc as UsuarioDoc); // email repetido -> 409 (índice único)
  return col.usuarios.findOne({ _id: insertedId }, { projection: SIN_SECRETOS });
}

/** Evita que el sistema quede sin ningún Administrador activo. */
async function asegurarOtroAdmin(id: ObjectId) {
  const otros = await col.usuarios.countDocuments({ _id: { $ne: id }, rol: "Administrador", estado: "activo" });
  if (otros === 0) throw conflicto("Debe quedar al menos un Administrador activo");
}

export async function actualizarUsuario(
  id: ObjectId,
  d: { nombreCompleto?: string; email?: string; rol?: Rol; password?: string },
  quien: UsuarioAutenticado,
) {
  const usuario = await col.usuarios.findOne({ _id: id });
  if (!usuario) throw noEncontrado("El usuario");
  if (d.rol && d.rol !== usuario.rol && usuario.rol === "Administrador") {
    if (id.equals(quien._id)) throw conflicto("No puedes quitarte a ti mismo el rol de Administrador");
    await asegurarOtroAdmin(id);
  }
  const cambios: Partial<UsuarioDoc> = {};
  if (d.nombreCompleto) cambios.nombreCompleto = d.nombreCompleto;
  if (d.email) cambios.email = d.email;
  if (d.rol) cambios.rol = d.rol;
  if (d.password) cambios.passwordHash = await bcrypt.hash(d.password, 10);
  if (Object.keys(cambios).length) await col.usuarios.updateOne({ _id: id }, { $set: cambios });
  return col.usuarios.findOne({ _id: id }, { projection: SIN_SECRETOS });
}

/** Desactivar en vez de borrar: sus movimientos siguen asociados a su nombre (RNF06). */
export async function cambiarEstado(id: ObjectId, estado: "activo" | "inactivo", quien: UsuarioAutenticado) {
  const usuario = await col.usuarios.findOne({ _id: id });
  if (!usuario) throw noEncontrado("El usuario");
  if (estado === "inactivo") {
    if (id.equals(quien._id)) throw conflicto("No puedes desactivar tu propia cuenta");
    if (usuario.rol === "Administrador") await asegurarOtroAdmin(id);
  }
  await col.usuarios.updateOne({ _id: id }, { $set: { estado } });
  return col.usuarios.findOne({ _id: id }, { projection: SIN_SECRETOS });
}
