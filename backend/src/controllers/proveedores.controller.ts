import type { Request, Response } from "express";
import * as servicio from "../services/proveedores.service";
import { idDeRuta, texto, textoObligatorio } from "../utils/validar";

export async function listar(_req: Request, res: Response) {
  res.json(await servicio.listarProveedores());
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(
    await servicio.crearProveedor({
      razonSocial: textoObligatorio(req.body?.razonSocial, "razonSocial", 120),
      telefono: texto(req.body?.telefono, "telefono", 20, true),
      email: texto(req.body?.email, "email", 150, true),
    }),
  );
}

export async function eliminar(req: Request, res: Response) {
  await servicio.eliminarProveedor(idDeRuta(req.params.id));
  res.status(204).end();
}
