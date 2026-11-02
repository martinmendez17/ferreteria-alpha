import type { Request, Response } from "express";
import { iniciarSesion } from "../services/auth.service";
import { textoObligatorio } from "../utils/validar";

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const email = textoObligatorio(req.body?.email, "email", 150);
  const password = textoObligatorio(req.body?.password, "password", 200);
  res.json(await iniciarSesion(email, password));
}

// GET /api/auth/perfil
export function perfil(req: Request, res: Response) {
  res.json({ usuario: req.usuario });
}
