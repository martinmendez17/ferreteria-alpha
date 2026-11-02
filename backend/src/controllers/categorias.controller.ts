import type { Request, Response } from "express";
import * as servicio from "../services/categorias.service";
import { idDeRuta, texto, textoObligatorio } from "../utils/validar";

export async function listar(_req: Request, res: Response) {
  res.json(await servicio.listarCategorias());
}

export async function crear(req: Request, res: Response) {
  const nombre = textoObligatorio(req.body?.nombre, "nombre", 80);
  const descripcion = texto(req.body?.descripcion, "descripcion", 255, true);
  res.status(201).json(await servicio.crearCategoria(nombre, descripcion));
}

export async function eliminar(req: Request, res: Response) {
  await servicio.eliminarCategoria(idDeRuta(req.params.id));
  res.status(204).end();
}
