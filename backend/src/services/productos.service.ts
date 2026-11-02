import type { Filter, ObjectId, Sort } from "mongodb";
import { COLACION_ES, col } from "../config/db";
import type { ProductoDoc } from "../types/modelos";
import { disponibilidad, estadoStock } from "../utils/estadoStock";
import { datosInvalidos, noEncontrado } from "../utils/httpError";
import { escaparRegex, respuestaPaginada } from "../utils/validar";

export const ORDENES = ["nombre_asc", "nombre_desc", "precio_asc", "precio_desc"] as const;
export type Orden = (typeof ORDENES)[number];

const ORDEN_MONGO: Record<Orden, Sort> = {
  nombre_asc: { nombre: 1 },
  nombre_desc: { nombre: -1 },
  precio_asc: { precioVenta: 1, nombre: 1 },
  precio_desc: { precioVenta: -1, nombre: 1 },
};

export interface FiltrosCatalogo {
  pagina: number;
  porPagina: number;
  saltar: number;
  texto?: string;
  categorias?: ObjectId[];
  precioMin?: number;
  precioMax?: number;
  soloConStock: boolean;
  orden: Orden;
}

/** Búsqueda por palabra en nombre, SKU, marca, descripción y palabras clave. */
export function filtroTexto(texto: string): Filter<ProductoDoc> {
  const re = new RegExp(escaparRegex(texto), "i");
  return { $or: [{ nombre: re }, { sku: re }, { marca: re }, { descripcion: re }, { palabrasClave: re }] };
}

/** Forma pública de un producto: no muestra el stock exacto, el mínimo ni el proveedor. */
function aVistaPublica(p: ProductoDoc) {
  return {
    _id: p._id,
    sku: p.sku,
    nombre: p.nombre,
    descripcion: p.descripcion ?? null,
    marca: p.marca ?? null,
    precioVenta: p.precioVenta,
    imagenUrl: p.imagenUrl ?? null,
    unidadMedida: p.unidadMedida,
    categoria: p.categoria,
    disponibilidad: disponibilidad(p.inventario.stockActual, p.stockMinimo),
  };
}

/**
 * RF01–RF03: catálogo paginado con búsqueda, filtros y orden.
 * Es la consulta C07 traducida: en SQL necesitaba JOIN con categoria e
 * inventario; aquí el documento del producto ya trae ambos datos.
 */
export async function listarCatalogo(f: FiltrosCatalogo) {
  const filtro: Filter<ProductoDoc> = { estado: "activo" };
  if (f.texto) Object.assign(filtro, filtroTexto(f.texto));
  if (f.categorias?.length) filtro["categoria._id"] = { $in: f.categorias };
  if (f.precioMin !== undefined || f.precioMax !== undefined) {
    filtro.precioVenta = {
      ...(f.precioMin !== undefined && { $gte: f.precioMin }),
      ...(f.precioMax !== undefined && { $lte: f.precioMax }),
    };
  }
  if (f.soloConStock) filtro["inventario.stockActual"] = { $gt: 0 };

  const [total, productos] = await Promise.all([
    col.productos.countDocuments(filtro),
    col.productos.find(filtro).collation(COLACION_ES).sort(ORDEN_MONGO[f.orden]).skip(f.saltar).limit(f.porPagina).toArray(),
  ]);
  return respuestaPaginada(productos.map(aVistaPublica), total, f);
}

/** RF04: ficha de un producto activo, con otros 3 de la misma categoría. */
export async function obtenerFicha(id: ObjectId) {
  const p = await col.productos.findOne({ _id: id, estado: "activo" });
  if (!p) throw noEncontrado("El producto");
  const relacionados = await col.productos
    .find({ "categoria._id": p.categoria._id, estado: "activo", _id: { $ne: p._id } })
    .collation(COLACION_ES)
    .sort({ "inventario.stockActual": -1, nombre: 1 })
    .limit(3)
    .toArray();
  return { ...aVistaPublica(p), relacionados: relacionados.map(aVistaPublica) };
}

/* ------------------------------------------------------------------ */
/* Administración del catálogo (RF09, solo Administrador)             */
/* ------------------------------------------------------------------ */

export interface DatosProducto {
  sku: string;
  nombre: string;
  descripcion?: string | null;
  marca?: string | null;
  precioVenta: number;
  imagenUrl?: string | null;
  idCategoria: ObjectId;
  idProveedor?: ObjectId | null;
  unidadMedida: string;
  stockMinimo: number;
  ubicacionBodega?: string | null;
  palabrasClave?: string[];
}

/** Vista completa para el Administrador (incluye stock, mínimo y proveedor). */
function aVistaInterna(p: ProductoDoc) {
  return { ...p, estadoStock: estadoStock(p.inventario.stockActual, p.stockMinimo) };
}

export async function listarAdmin(f: { texto?: string; idCategoria?: ObjectId; estado?: "activo" | "descontinuado"; pagina: number; porPagina: number; saltar: number }) {
  const filtro: Filter<ProductoDoc> = {};
  if (f.texto) Object.assign(filtro, filtroTexto(f.texto));
  if (f.idCategoria) filtro["categoria._id"] = f.idCategoria;
  if (f.estado) filtro.estado = f.estado;
  const [total, productos] = await Promise.all([
    col.productos.countDocuments(filtro),
    col.productos.find(filtro).collation(COLACION_ES).sort({ estado: 1, nombre: 1 }).skip(f.saltar).limit(f.porPagina).toArray(),
  ]);
  return respuestaPaginada(productos.map(aVistaInterna), total, f);
}

export async function obtenerAdmin(id: ObjectId) {
  const p = await col.productos.findOne({ _id: id });
  if (!p) throw noEncontrado("El producto");
  return aVistaInterna(p);
}

/** Busca la categoría y el proveedor para guardar la "referencia extendida" (_id + nombre). */
async function referencias(idCategoria?: ObjectId, idProveedor?: ObjectId | null) {
  const resultado: Partial<Pick<ProductoDoc, "categoria" | "proveedor">> = {};
  if (idCategoria) {
    const c = await col.categorias.findOne({ _id: idCategoria });
    if (!c) throw datosInvalidos("La categoría elegida no existe", { campo: "idCategoria" });
    resultado.categoria = { _id: c._id, nombre: c.nombre };
  }
  if (idProveedor === null) resultado.proveedor = null;
  else if (idProveedor) {
    const p = await col.proveedores.findOne({ _id: idProveedor });
    if (!p) throw datosInvalidos("El proveedor elegido no existe", { campo: "idProveedor" });
    resultado.proveedor = { _id: p._id, razonSocial: p.razonSocial };
  }
  return resultado;
}

/** RF09 · consultas C01 y C02: alta de producto. El stock parte en 0 y solo cambia con movimientos. */
export async function crearProducto(d: DatosProducto) {
  const refs = await referencias(d.idCategoria, d.idProveedor ?? null);
  const doc: Omit<ProductoDoc, "_id"> = {
    sku: d.sku.toUpperCase(),
    nombre: d.nombre,
    descripcion: d.descripcion ?? null,
    marca: d.marca ?? null,
    precioVenta: d.precioVenta,
    imagenUrl: d.imagenUrl ?? null,
    unidadMedida: d.unidadMedida,
    stockMinimo: d.stockMinimo,
    estado: "activo",
    palabrasClave: d.palabrasClave ?? [],
    categoria: refs.categoria!,
    proveedor: refs.proveedor ?? null,
    inventario: { stockActual: 0, ubicacionBodega: d.ubicacionBodega ?? null, fechaActualizacion: new Date() },
  };
  const { insertedId } = await col.productos.insertOne(doc as ProductoDoc);
  return obtenerAdmin(insertedId);
}

/** RF09: edición de los datos del producto (el stock NO se edita aquí: solo con movimientos). */
export async function actualizarProducto(id: ObjectId, d: Partial<DatosProducto>) {
  const actual = await col.productos.findOne({ _id: id }, { projection: { _id: 1 } });
  if (!actual) throw noEncontrado("El producto");

  const refs = await referencias(d.idCategoria, d.idProveedor);
  const cambios: Record<string, unknown> = { ...refs };
  const campos = ["nombre", "descripcion", "marca", "precioVenta", "imagenUrl", "unidadMedida", "stockMinimo", "palabrasClave"] as const;
  for (const campo of campos) if (d[campo] !== undefined) cambios[campo] = d[campo];
  if (d.sku !== undefined) cambios["sku"] = d.sku.toUpperCase();
  if (d.ubicacionBodega !== undefined) cambios["inventario.ubicacionBodega"] = d.ubicacionBodega;

  if (Object.keys(cambios).length > 0) await col.productos.updateOne({ _id: id }, { $set: cambios });
  return obtenerAdmin(id);
}

/** RF09 · consulta C05: baja lógica (o reactivación). No se borra para conservar su historial. */
export async function cambiarEstado(id: ObjectId, estado: "activo" | "descontinuado") {
  const r = await col.productos.updateOne({ _id: id }, { $set: { estado } });
  if (r.matchedCount === 0) throw noEncontrado("El producto");
  return obtenerAdmin(id);
}
