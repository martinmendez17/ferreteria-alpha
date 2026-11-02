import type { Request, Response } from "express";
import * as servicio from "../services/auth.service";
import { contrasenaNueva, email, textoObligatorio } from "../utils/validar";

// POST /api/auth/login   { email, password }
export async function login(req: Request, res: Response) {
  const correo = textoObligatorio(req.body?.email, "email", 150);
  const password = textoObligatorio(req.body?.password, "password", 200);
  res.json(await servicio.iniciarSesion(correo, password));
}

// GET /api/auth/perfil
export function perfil(req: Request, res: Response) {
  res.json({ usuario: req.usuario });
}

// POST /api/auth/recuperar   { email }
export async function recuperar(req: Request, res: Response) {
  res.json(await servicio.solicitarRecuperacion(email(req.body?.email)));
}

// POST /api/auth/restablecer   { token, password }
export async function restablecer(req: Request, res: Response) {
  const token = textoObligatorio(req.body?.token, "token", 128);
  res.json(await servicio.restablecerContrasena(token, contrasenaNueva(req.body?.password)));
}
