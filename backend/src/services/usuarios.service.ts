import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { datosInvalidos, noEncontrado } from "../utils/httpError";

const sinContrasena = {
  idUsuario: true, nombreCompleto: true, email: true, estado: true, fechaCreacion: true,
  rol: { select: { nombreRol: true } },
} as const;

/** RF16: gestión de cuentas por el Administrador. */
export async function listarUsuarios() {
  return prisma.usuario.findMany({ select: sinContrasena, orderBy: { nombreCompleto: "asc" } });
}

export async function crearUsuario(d: { nombreCompleto: string; email: string; password: string; rol: string }) {
  if (d.password.length < 8) throw datosInvalidos("La contraseña debe tener al menos 8 caracteres");
  const rol = await prisma.rol.findUnique({ where: { nombreRol: d.rol } });
  if (!rol) throw datosInvalidos(`El rol "${d.rol}" no existe`);

  const passwordHash = await bcrypt.hash(d.password, 10); // RNF01: nunca se guarda en texto plano
  return prisma.usuario.create({
    data: { nombreCompleto: d.nombreCompleto, email: d.email.toLowerCase(), passwordHash, idRol: rol.idRol },
    select: sinContrasena,
  });
}

/** Desactivar en vez de borrar: sus movimientos siguen asociados a su nombre (RNF06). */
export async function cambiarEstado(idUsuario: number, estado: "activo" | "inactivo") {
  const existe = await prisma.usuario.count({ where: { idUsuario } });
  if (!existe) throw noEncontrado("El usuario");
  return prisma.usuario.update({ where: { idUsuario }, data: { estado }, select: sinContrasena });
}
