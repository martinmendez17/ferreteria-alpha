import { prisma } from "../config/prisma";
import { disponibilidad } from "../utils/estadoStock";
import { noEncontrado } from "../utils/httpError";

export interface FiltrosCatalogo {
  pagina: number;
  porPagina: number;
  texto?: string;
  idCategoria?: number;
  precioMin?: number;
  precioMax?: number;
  soloConStock: boolean;
}

export interface DatosProducto {
  sku: string;
  nombre: string;
  descripcion?: string;
  precioVenta: number;
  idCategoria: number;
  idProveedor?: number | null;
  unidadMedida: string;
  stockMinimo: number;
  ubicacionBodega?: string;
}

type ProductoConRelaciones = {
  idProducto: number; sku: string; nombre: string; descripcion: string | null;
  precioVenta: unknown; unidadMedida: string; stockMinimo: number; estado: string;
  categoria: { idCategoria: number; nombre: string };
  inventario: { stockActual: number } | null;
};

/** Forma pública de un producto: no expone el stock mínimo ni datos internos. */
function aVistaPublica(p: ProductoConRelaciones) {
  const stock = p.inventario?.stockActual ?? 0;
  return {
    idProducto: p.idProducto,
    sku: p.sku,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioVenta: Number(p.precioVenta),
    unidadMedida: p.unidadMedida,
    categoria: p.categoria,
    stockActual: stock,
    disponibilidad: disponibilidad(stock, p.stockMinimo),
  };
}

/** RF01–RF03: catálogo paginado con búsqueda y filtros (ver consulta C07). */
export async function listarCatalogo(f: FiltrosCatalogo) {
  const where = {
    estado: "activo",
    ...(f.texto && {
      OR: [
        { nombre: { contains: f.texto, mode: "insensitive" as const } },
        { sku: { contains: f.texto, mode: "insensitive" as const } },
        { descripcion: { contains: f.texto, mode: "insensitive" as const } },
      ],
    }),
    ...(f.idCategoria && { idCategoria: f.idCategoria }),
    ...((f.precioMin !== undefined || f.precioMax !== undefined) && {
      precioVenta: {
        ...(f.precioMin !== undefined && { gte: f.precioMin }),
        ...(f.precioMax !== undefined && { lte: f.precioMax }),
      },
    }),
    ...(f.soloConStock && { inventario: { is: { stockActual: { gt: 0 } } } }),
  };

  const [total, productos] = await prisma.$transaction([
    prisma.producto.count({ where }),
    prisma.producto.findMany({
      where,
      include: { categoria: { select: { idCategoria: true, nombre: true } }, inventario: { select: { stockActual: true } } },
      orderBy: { nombre: "asc" },
      skip: (f.pagina - 1) * f.porPagina,
      take: f.porPagina,
    }),
  ]);

  return {
    datos: productos.map(aVistaPublica),
    pagina: f.pagina,
    porPagina: f.porPagina,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / f.porPagina)),
  };
}

/** RF04: ficha de un producto activo. */
export async function obtenerFicha(idProducto: number) {
  const p = await prisma.producto.findFirst({
    where: { idProducto, estado: "activo" },
    include: { categoria: { select: { idCategoria: true, nombre: true } }, inventario: { select: { stockActual: true } } },
  });
  if (!p) throw noEncontrado("El producto");
  return aVistaPublica(p);
}

/** RF09: alta de producto. Crea también su registro de inventario (1:1) en la misma transacción. */
export async function crearProducto(d: DatosProducto) {
  return prisma.producto.create({
    data: {
      sku: d.sku.toUpperCase(),
      nombre: d.nombre,
      descripcion: d.descripcion,
      precioVenta: d.precioVenta,
      idCategoria: d.idCategoria,
      idProveedor: d.idProveedor ?? null,
      unidadMedida: d.unidadMedida,
      stockMinimo: d.stockMinimo,
      inventario: { create: { stockActual: 0, ubicacionBodega: d.ubicacionBodega } },
    },
    include: { inventario: true },
  });
}

/** RF09: edición de los datos del producto (el stock se cambia solo con movimientos). */
export async function actualizarProducto(idProducto: number, d: Partial<DatosProducto>) {
  await asegurarExiste(idProducto);
  return prisma.producto.update({
    where: { idProducto },
    data: {
      sku: d.sku?.toUpperCase(),
      nombre: d.nombre,
      descripcion: d.descripcion,
      precioVenta: d.precioVenta,
      idCategoria: d.idCategoria,
      idProveedor: d.idProveedor,
      unidadMedida: d.unidadMedida,
      stockMinimo: d.stockMinimo,
    },
  });
}

/** RF09: baja lógica (consulta C05). El producto no se borra para conservar su historial. */
export async function darDeBaja(idProducto: number) {
  await asegurarExiste(idProducto);
  return prisma.producto.update({ where: { idProducto }, data: { estado: "descontinuado" } });
}

async function asegurarExiste(idProducto: number) {
  const existe = await prisma.producto.count({ where: { idProducto } });
  if (!existe) throw noEncontrado("El producto");
}
