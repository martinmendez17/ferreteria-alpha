import type { NextFunction, Request, Response } from "express";
import { MongoNetworkError, MongoServerError, MongoServerSelectionError } from "mongodb";
import { HttpError } from "../utils/httpError";

/*
 * Todas las respuestas de error tienen la misma forma:
 *   { "error": "mensaje para mostrar", "codigo": "DATOS_INVALIDOS", "detalles": {...} }
 * Así el frontend siempre sabe dónde leer el mensaje.
 */

/** Rutas que no existen: 404. */
export function rutaNoEncontrada(req: Request, res: Response) {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.originalUrl}`, codigo: "RUTA_NO_ENCONTRADA" });
}

const NOMBRES_CAMPO: Record<string, string> = {
  sku: "un producto con ese SKU",
  email: "un usuario con ese correo",
  nombre: "una categoría con ese nombre",
};

/** Manejador central. Express 5 envía aquí también los errores de las funciones async. */
export function manejarErrores(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, codigo: err.codigo, detalles: err.detalles });
    return;
  }

  // Índice único repetido (equivale a violar un UNIQUE en SQL)
  if (err instanceof MongoServerError && err.code === 11000) {
    const campo = Object.keys(err.keyValue ?? err.keyPattern ?? {})[0] ?? "valor";
    res.status(409).json({
      error: `Ya existe ${NOMBRES_CAMPO[campo] ?? "un registro con ese valor"}`,
      codigo: "DUPLICADO",
      detalles: { campo },
    });
    return;
  }
  // El documento no cumple el validador $jsonSchema (equivale a violar un CHECK)
  if (err instanceof MongoServerError && err.code === 121) {
    res.status(422).json({
      error: "Los datos no cumplen las reglas de la base de datos",
      codigo: "VALIDACION_BD",
    });
    return;
  }
  // Sin conexión a MongoDB
  if (err instanceof MongoServerSelectionError || err instanceof MongoNetworkError) {
    console.error("[BD]", err.message);
    res.status(503).json({
      error: "No hay conexión con la base de datos. Intenta de nuevo en unos segundos",
      codigo: "BD_NO_DISPONIBLE",
    });
    return;
  }

  const tipo = (err as { type?: string })?.type;
  if (tipo === "entity.parse.failed") {
    res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido", codigo: "JSON_INVALIDO" });
    return;
  }
  if (tipo === "entity.too.large") {
    res.status(413).json({ error: "La petición es demasiado grande", codigo: "PETICION_GRANDE" });
    return;
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ error: "Ocurrió un error inesperado en el servidor", codigo: "ERROR_INTERNO" });
}
