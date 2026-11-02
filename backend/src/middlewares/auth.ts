import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";
import type { UsuarioAutenticado } from "../types/express";

export const ROLES = { ADMIN: "Administrador", EMPLEADO: "Empleado" } as const;

/** Exige un token JWT válido en el encabezado Authorization: Bearer <token>. (RF08, RNF01) */
export function requiereSesion(req: Request, _res: Response, next: NextFunction) {
  const encabezado = req.headers.authorization ?? "";
  const [tipo, token] = encabezado.split(" ");
  if (tipo !== "Bearer" || !token) {
    throw new HttpError(401, "Debes iniciar sesión");
  }
  let datos: jwt.JwtPayload & Omit<UsuarioAutenticado, "idUsuario">;
  try {
    datos = jwt.verify(token, env.jwtSecret) as typeof datos;
  } catch {
    throw new HttpError(401, "La sesión no es válida o expiró");
  }
  req.usuario = { idUsuario: Number(datos.sub), nombre: datos.nombre, rol: datos.rol };
  next();
}

/** Exige que el usuario autenticado tenga alguno de los roles indicados. */
export function requiereRol(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) throw new HttpError(401, "Debes iniciar sesión");
    if (!roles.includes(req.usuario.rol)) {
      throw new HttpError(403, "No tienes permiso para esta acción");
    }
    next();
  };
}

export const soloAdmin = requiereRol(ROLES.ADMIN);
