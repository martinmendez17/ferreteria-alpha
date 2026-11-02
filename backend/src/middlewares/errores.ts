import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

/** Rutas que no existen. */
export function rutaNoEncontrada(req: Request, res: Response) {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.originalUrl}` });
}

/**
 * Manejador central de errores. Express 5 envía aquí también los errores
 * de las funciones async, sin necesidad de try/catch en cada controlador.
 */
export function manejarErrores(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, detalles: err.detalles });
    return;
  }

  // Errores conocidos de Prisma
  const codigo = (err as { code?: string })?.code;
  if (codigo === "P2002") {
    res.status(409).json({ error: "Ya existe un registro con ese valor único (por ejemplo, el SKU o el email)" });
    return;
  }
  if (codigo === "P2003") {
    res.status(409).json({ error: "La operación viola una relación con otra tabla (clave foránea)" });
    return;
  }
  if (codigo === "P2025") {
    res.status(404).json({ error: "El registro no existe" });
    return;
  }
  // JSON mal formado en el cuerpo de la petición
  if ((err as { type?: string })?.type === "entity.parse.failed") {
    res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
