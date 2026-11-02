import type { Request, Response } from "express";
import * as servicio from "../services/usuarios.service";
import { ROLES } from "../types/modelos";
import { datosInvalidos } from "../utils/httpError";
import { contrasenaNueva, email, idDeRuta, opcion, texto, textoObligatorio } from "../utils/validar";

export async function listar(_req: Request, res: Response) {
  res.json(await servicio.listarUsuarios());
}

export async function crear(req: Request, res: Response) {
  const b = req.body ?? {};
  res.status(201).json(
    await servicio.crearUsuario({
      nombreCompleto: textoObligatorio(b.nombreCompleto, "nombreCompleto", 120),
      email: email(b.email),
      password: contrasenaNueva(b.password),
      rol: opcion(b.rol, "rol", ROLES),
    }),
  );
}

export async function actualizar(req: Request, res: Response) {
  const b = req.body ?? {};
  const datos = {
    nombreCompleto: texto(b.nombreCompleto, "nombreCompleto", 120, true),
    email: b.email === undefined ? undefined : email(b.email),
    rol: b.rol === undefined ? undefined : opcion(b.rol, "rol", ROLES),
    password: b.password === undefined || b.password === "" ? undefined : contrasenaNueva(b.password),
  };
  if (Object.values(datos).every((v) => v === undefined)) throw datosInvalidos("No hay cambios que guardar");
  res.json(await servicio.actualizarUsuario(idDeRuta(req.params["id"]), datos, req.usuario!));
}

export async function cambiarEstado(req: Request, res: Response) {
  const estado = opcion(req.body?.estado, "estado", ["activo", "inactivo"] as const);
  res.json(await servicio.cambiarEstado(idDeRuta(req.params["id"]), estado, req.usuario!));
}
