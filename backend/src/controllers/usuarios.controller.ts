import type { Request, Response } from "express";
import * as servicio from "../services/usuarios.service";
import { idDeRuta, opcion, textoObligatorio } from "../utils/validar";

export async function listar(_req: Request, res: Response) {
  res.json(await servicio.listarUsuarios());
}

export async function crear(req: Request, res: Response) {
  const b = req.body ?? {};
  res.status(201).json(
    await servicio.crearUsuario({
      nombreCompleto: textoObligatorio(b.nombreCompleto, "nombreCompleto", 120),
      email: textoObligatorio(b.email, "email", 150),
      password: textoObligatorio(b.password, "password", 200),
      rol: opcion(b.rol, "rol", ["Administrador", "Empleado"] as const),
    }),
  );
}

export async function cambiarEstado(req: Request, res: Response) {
  const estado = opcion(req.body?.estado, "estado", ["activo", "inactivo"] as const);
  res.json(await servicio.cambiarEstado(idDeRuta(req.params.id), estado));
}
