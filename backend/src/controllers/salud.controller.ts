import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

// GET /api/salud — demuestra que la API está arriba y conectada a PostgreSQL
export async function salud(_req: Request, res: Response) {
  const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
  const [productos, movimientos] = await Promise.all([
    prisma.producto.count(),
    prisma.movimientoInventario.count(),
  ]);
  res.json({ api: "ok", baseDeDatos: "conectada", motor: version, productos, movimientos });
}
