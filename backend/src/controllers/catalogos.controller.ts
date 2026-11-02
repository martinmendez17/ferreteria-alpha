import type { Request, Response } from "express";
import * as categorias from "../services/categorias.service";
import * as proveedores from "../services/proveedores.service";
import { datosInvalidos } from "../utils/httpError";
import { email as validarEmail, idDeRuta, texto, textoObligatorio } from "../utils/validar";

/* Categorías (RF03, RF15) */

export async function listarCategorias(_req: Request, res: Response) {
  res.json(await categorias.listarCategorias());
}

export async function crearCategoria(req: Request, res: Response) {
  const nombre = textoObligatorio(req.body?.nombre, "nombre", 80);
  const descripcion = texto(req.body?.descripcion, "descripcion", 255, true);
  res.status(201).json(await categorias.crearCategoria(nombre, descripcion));
}

export async function actualizarCategoria(req: Request, res: Response) {
  const nombre = texto(req.body?.nombre, "nombre", 80, true);
  const descripcion = req.body?.descripcion === null ? null : texto(req.body?.descripcion, "descripcion", 255, true);
  if (nombre === undefined && descripcion === undefined) throw datosInvalidos("No hay cambios que guardar");
  res.json(
    await categorias.actualizarCategoria(idDeRuta(req.params["id"]), {
      ...(nombre ? { nombre } : {}),
      ...(descripcion !== undefined ? { descripcion } : {}),
    }),
  );
}

export async function eliminarCategoria(req: Request, res: Response) {
  await categorias.eliminarCategoria(idDeRuta(req.params["id"]));
  res.status(204).end();
}

/* Proveedores (RF15) */

function leerProveedor(b: Record<string, unknown>, parcial: boolean): proveedores.DatosProveedor {
  const correo = b["email"] === undefined || b["email"] === null || b["email"] === "" ? (b["email"] === undefined ? undefined : null) : validarEmail(b["email"]);
  const telefono = b["telefono"] === null || b["telefono"] === "" ? null : texto(b["telefono"], "telefono", 20, true);
  if (telefono && !/^[+\d\s()-]{6,20}$/.test(telefono)) throw datosInvalidos("El teléfono solo puede tener números, espacios y +", { campo: "telefono" });
  return {
    razonSocial: parcial ? texto(b["razonSocial"], "razonSocial", 120, true) : textoObligatorio(b["razonSocial"], "razonSocial", 120),
    ...(telefono !== undefined && { telefono }),
    ...(correo !== undefined && { email: correo }),
  };
}

export async function listarProveedores(_req: Request, res: Response) {
  res.json(await proveedores.listarProveedores());
}

export async function crearProveedor(req: Request, res: Response) {
  const datos = leerProveedor(req.body ?? {}, false);
  res.status(201).json(await proveedores.crearProveedor(datos as { razonSocial: string }));
}

export async function actualizarProveedor(req: Request, res: Response) {
  const datos = leerProveedor(req.body ?? {}, true);
  if (datos.razonSocial === undefined) delete datos.razonSocial;
  if (Object.keys(datos).length === 0) throw datosInvalidos("No hay cambios que guardar");
  res.json(await proveedores.actualizarProveedor(idDeRuta(req.params["id"]), datos));
}

export async function eliminarProveedor(req: Request, res: Response) {
  await proveedores.eliminarProveedor(idDeRuta(req.params["id"]));
  res.status(204).end();
}
