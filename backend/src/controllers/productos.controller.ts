import type { Request, Response } from "express";
import * as servicio from "../services/productos.service";
import { entero, enteroObligatorio, idDeRuta, numero, texto, textoObligatorio } from "../utils/validar";

// GET /api/productos?pagina=1&porPagina=20&q=martillo&categoria=1&precioMin=1000&precioMax=50000&soloStock=true
export async function listar(req: Request, res: Response) {
  const q = req.query;
  const resultado = await servicio.listarCatalogo({
    pagina: entero(q.pagina, "pagina", { min: 1, opcional: true }) ?? 1,
    porPagina: Math.min(entero(q.porPagina, "porPagina", { min: 1, opcional: true }) ?? 20, 100),
    texto: texto(q.q, "q", 100, true),
    idCategoria: entero(q.categoria, "categoria", { min: 1, opcional: true }),
    precioMin: q.precioMin !== undefined ? numero(q.precioMin, "precioMin") : undefined,
    precioMax: q.precioMax !== undefined ? numero(q.precioMax, "precioMax") : undefined,
    soloConStock: q.soloStock === "true",
  });
  res.json(resultado);
}

// GET /api/productos/:id
export async function ficha(req: Request, res: Response) {
  res.json(await servicio.obtenerFicha(idDeRuta(req.params.id)));
}

function leerDatos(body: Record<string, unknown>, parcial: boolean) {
  const opt = parcial;
  const txt = (v: unknown, c: string, max: number) => (opt ? texto(v, c, max, true) : textoObligatorio(v, c, max));
  return {
    sku: txt(body.sku, "sku", 40),
    nombre: txt(body.nombre, "nombre", 150),
    descripcion: texto(body.descripcion, "descripcion", 2000, true),
    precioVenta: body.precioVenta === undefined && opt ? undefined : numero(body.precioVenta, "precioVenta"),
    idCategoria: body.idCategoria === undefined && opt ? undefined : enteroObligatorio(body.idCategoria, "idCategoria", 1),
    idProveedor: body.idProveedor === null ? null : entero(body.idProveedor, "idProveedor", { min: 1, opcional: true }),
    unidadMedida: txt(body.unidadMedida, "unidadMedida", 20),
    stockMinimo: body.stockMinimo === undefined ? (opt ? undefined : 0) : enteroObligatorio(body.stockMinimo, "stockMinimo", 0),
    ubicacionBodega: texto(body.ubicacionBodega, "ubicacionBodega", 60, true),
  };
}

// POST /api/productos  (Administrador)
export async function crear(req: Request, res: Response) {
  const datos = leerDatos(req.body ?? {}, false) as servicio.DatosProducto;
  res.status(201).json(await servicio.crearProducto(datos));
}

// PUT /api/productos/:id  (Administrador)
export async function actualizar(req: Request, res: Response) {
  const { ubicacionBodega: _ignorada, ...datos } = leerDatos(req.body ?? {}, true);
  res.json(await servicio.actualizarProducto(idDeRuta(req.params.id), datos));
}

// PATCH /api/productos/:id/baja  (Administrador)
export async function baja(req: Request, res: Response) {
  res.json(await servicio.darDeBaja(idDeRuta(req.params.id)));
}
