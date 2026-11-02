import type { Request, Response } from "express";
import * as servicio from "../services/productos.service";
import { datosInvalidos, peticionInvalida } from "../utils/httpError";
import {
  entero, enteroObligatorio, idDeCampo, idDeRuta, listaDeIds, listaDeTextos, opcion, opcionOpcional,
  paginacion, texto, textoObligatorio, urlImagen,
} from "../utils/validar";

// GET /api/productos?q=&categorias=id1,id2&precioMin=&precioMax=&soloStock=true&orden=precio_asc&pagina=1&porPagina=8
export async function catalogo(req: Request, res: Response) {
  const q = req.query as Record<string, unknown>;
  const precioMin = entero(q["precioMin"], "precioMin", { opcional: true });
  const precioMax = entero(q["precioMax"], "precioMax", { opcional: true });
  if (precioMin !== undefined && precioMax !== undefined && precioMin > precioMax) {
    throw peticionInvalida("El precio mínimo no puede ser mayor que el máximo");
  }
  res.json(
    await servicio.listarCatalogo({
      ...paginacion(q, 8, 48),
      texto: texto(q["q"], "q", 100, true),
      categorias: listaDeIds(q["categorias"], "categorias"),
      precioMin,
      precioMax,
      soloConStock: q["soloStock"] === "true",
      orden: opcionOpcional(q["orden"], "orden", servicio.ORDENES) ?? "nombre_asc",
    }),
  );
}

// GET /api/productos/:id
export async function ficha(req: Request, res: Response) {
  res.json(await servicio.obtenerFicha(idDeRuta(req.params["id"], "id del producto")));
}

// GET /api/productos/admin/lista?q=&categoria=&estado=   (Administrador)
export async function listaAdmin(req: Request, res: Response) {
  const q = req.query as Record<string, unknown>;
  res.json(
    await servicio.listarAdmin({
      ...paginacion(q, 10),
      texto: texto(q["q"], "q", 100, true),
      idCategoria: idDeCampo(q["categoria"], "categoria", true),
      estado: opcionOpcional(q["estado"], "estado", ["activo", "descontinuado"] as const),
    }),
  );
}

// GET /api/productos/admin/:id   (Administrador)
export async function detalleAdmin(req: Request, res: Response) {
  res.json(await servicio.obtenerAdmin(idDeRuta(req.params["id"], "id del producto")));
}

function leerDatos(b: Record<string, unknown>, parcial: boolean): Partial<servicio.DatosProducto> {
  const txt = (v: unknown, c: string, max: number) => (parcial ? texto(v, c, max, true) : textoObligatorio(v, c, max));
  const opcionalONull = (v: unknown, c: string, max: number) => (v === null ? null : texto(v, c, max, true));
  const sku = txt(b["sku"], "sku", 40);
  if (sku !== undefined && !/^[A-Za-z0-9-]{3,40}$/.test(sku)) {
    throw datosInvalidos("El SKU solo puede tener letras, números y guiones (ej. MED-0060)", { campo: "sku" });
  }
  return {
    sku,
    nombre: txt(b["nombre"], "nombre", 150),
    descripcion: opcionalONull(b["descripcion"], "descripcion", 2000),
    marca: opcionalONull(b["marca"], "marca", 60),
    precioVenta: parcial && b["precioVenta"] === undefined ? undefined : enteroObligatorio(b["precioVenta"], "precioVenta", 0, 100_000_000),
    imagenUrl: urlImagen(b["imagenUrl"]),
    idCategoria: parcial && b["idCategoria"] === undefined ? undefined : idDeCampo(b["idCategoria"], "idCategoria"),
    idProveedor: b["idProveedor"] === null || b["idProveedor"] === "" ? null : idDeCampo(b["idProveedor"], "idProveedor", true),
    unidadMedida: txt(b["unidadMedida"], "unidadMedida", 20),
    stockMinimo: b["stockMinimo"] === undefined ? (parcial ? undefined : 0) : enteroObligatorio(b["stockMinimo"], "stockMinimo", 0, 100_000),
    ubicacionBodega: opcionalONull(b["ubicacionBodega"], "ubicacionBodega", 60),
    palabrasClave: listaDeTextos(b["palabrasClave"], "palabrasClave"),
  };
}

// POST /api/productos   (Administrador)
export async function crear(req: Request, res: Response) {
  const datos = leerDatos(req.body ?? {}, false) as servicio.DatosProducto;
  res.status(201).json(await servicio.crearProducto(datos));
}

// PUT /api/productos/:id   (Administrador)
export async function actualizar(req: Request, res: Response) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const datos = leerDatos(body, true);
  // En una edición, idProveedor ausente significa "no cambiar"
  if (!("idProveedor" in body)) delete datos.idProveedor;
  res.json(await servicio.actualizarProducto(idDeRuta(req.params["id"], "id del producto"), datos));
}

// PATCH /api/productos/:id/estado   { estado: "activo" | "descontinuado" }   (Administrador)
export async function cambiarEstado(req: Request, res: Response) {
  const estado = opcion(req.body?.estado, "estado", ["activo", "descontinuado"] as const);
  res.json(await servicio.cambiarEstado(idDeRuta(req.params["id"], "id del producto"), estado));
}
