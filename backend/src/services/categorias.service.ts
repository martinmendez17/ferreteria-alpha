import { prisma } from "../config/prisma";
import { conflicto, noEncontrado } from "../utils/httpError";

/** RF03 y RF15: categorías con la cantidad de productos activos de cada una. */
export async function listarCategorias() {
  const categorias = await prisma.categoria.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { productos: { where: { estado: "activo" } } } } },
  });
  return categorias.map(({ _count, ...c }) => ({ ...c, productosActivos: _count.productos }));
}

export async function crearCategoria(nombre: string, descripcion?: string) {
  return prisma.categoria.create({ data: { nombre, descripcion } });
}

/** RF15: solo se puede eliminar si no tiene productos (consulta C09 y regla ON DELETE RESTRICT). */
export async function eliminarCategoria(idCategoria: number) {
  const categoria = await prisma.categoria.findUnique({
    where: { idCategoria },
    include: { _count: { select: { productos: true } } },
  });
  if (!categoria) throw noEncontrado("La categoría");
  if (categoria._count.productos > 0) {
    throw conflicto(`No se puede eliminar: la categoría tiene ${categoria._count.productos} producto(s) asociados`);
  }
  await prisma.categoria.delete({ where: { idCategoria } });
}
