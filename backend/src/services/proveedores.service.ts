import { prisma } from "../config/prisma";
import { conflicto, noEncontrado } from "../utils/httpError";

export async function listarProveedores() {
  return prisma.proveedor.findMany({ orderBy: { razonSocial: "asc" } });
}

export async function crearProveedor(d: { razonSocial: string; telefono?: string; email?: string }) {
  return prisma.proveedor.create({ data: d });
}

/** RF15: solo se elimina un proveedor sin productos asociados (consulta C10). */
export async function eliminarProveedor(idProveedor: number) {
  const proveedor = await prisma.proveedor.findUnique({
    where: { idProveedor },
    include: { _count: { select: { productos: true } } },
  });
  if (!proveedor) throw noEncontrado("El proveedor");
  if (proveedor._count.productos > 0) {
    throw conflicto(`No se puede eliminar: el proveedor tiene ${proveedor._count.productos} producto(s) asociados`);
  }
  await prisma.proveedor.delete({ where: { idProveedor } });
}
