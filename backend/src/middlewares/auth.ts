import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { col } from "../config/db";
import { env } from "../config/env";
import type { Rol } from "../types/modelos";
import { noAutenticado, sinPermiso } from "../utils/httpError";

/**
 * Exige un token JWT válido en el encabezado Authorization: Bearer <token>. (RF08, RNF01)
 * Además revisa en la base que la cuenta siga activa: si el Administrador
 * desactiva a alguien, su sesión deja de servir de inmediato.
 */
export async function requiereSesion(req: Request, _res: Response, next: NextFunction) {
  const [tipo, token] = (req.headers.authorization ?? "").split(" ");
  if (tipo !== "Bearer" || !token) throw noAutenticado("Debes iniciar sesión para usar esta función");

  let sub: string | undefined;
  try {
    sub = (jwt.verify(token, env.jwtSecret) as jwt.JwtPayload).sub;
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) throw noAutenticado("Tu sesión expiró; vuelve a ingresar");
    throw noAutenticado("La sesión no es válida; vuelve a ingresar");
  }
  if (!sub || !ObjectId.isValid(sub)) throw noAutenticado("La sesión no es válida; vuelve a ingresar");

  const usuario = await col.usuarios.findOne(
    { _id: new ObjectId(sub) },
    { projection: { nombreCompleto: 1, email: 1, rol: 1, estado: 1 } },
  );
  if (!usuario) throw noAutenticado("La cuenta ya no existe");
  if (usuario.estado !== "activo") throw noAutenticado("Tu cuenta está desactivada. Habla con el Administrador");

  req.usuario = { _id: usuario._id, nombreCompleto: usuario.nombreCompleto, email: usuario.email, rol: usuario.rol };
  next();
}

/** Exige que el usuario autenticado tenga alguno de los roles indicados. */
export function requiereRol(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) throw noAutenticado();
    if (!roles.includes(req.usuario.rol)) throw sinPermiso("Esta acción es solo para el Administrador");
    next();
  };
}

export const soloAdmin = requiereRol("Administrador");
