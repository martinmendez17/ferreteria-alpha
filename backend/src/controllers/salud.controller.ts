import type { Request, Response } from "express";
import { col, db } from "../config/db";

// GET /api/salud — demuestra que la API está arriba y conectada a MongoDB
export async function salud(_req: Request, res: Response) {
  const inicio = performance.now();
  await db.command({ ping: 1 });
  const latenciaMs = Math.round(performance.now() - inicio);

  let version = "desconocida";
  try {
    version = String((await db.command({ buildInfo: 1 }))["version"]);
  } catch {
    /* algunos planes de Atlas no permiten buildInfo */
  }

  const [usuarios, categorias, proveedores, productos, movimientos] = await Promise.all([
    col.usuarios.estimatedDocumentCount(),
    col.categorias.estimatedDocumentCount(),
    col.proveedores.estimatedDocumentCount(),
    col.productos.estimatedDocumentCount(),
    col.movimientos.estimatedDocumentCount(),
  ]);

  res.json({
    api: "ok",
    baseDeDatos: "conectada",
    motor: `MongoDB ${version}`,
    nombreBase: db.databaseName,
    latenciaMs,
    documentos: { usuarios, categorias, proveedores, productos, movimientos },
  });
}
