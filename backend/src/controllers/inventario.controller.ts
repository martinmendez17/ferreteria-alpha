import type { Request, Response } from "express";
import * as servicio from "../services/inventario.service";
import type { EstadoStock } from "../utils/estadoStock";
import { opcion, texto } from "../utils/validar";

const ESTADOS = ["sin_stock", "critico", "bajo", "normal"] as const satisfies readonly EstadoStock[];

// GET /api/inventario?q=tornillo&estado=critico
export async function listar(req: Request, res: Response) {
  res.json(
    await servicio.listarInventario({
      texto: texto(req.query.q, "q", 100, true),
      estado: req.query.estado ? opcion(req.query.estado, "estado", ESTADOS) : undefined,
    }),
  );
}

// GET /api/inventario/resumen
export async function resumen(_req: Request, res: Response) {
  res.json(await servicio.resumenInventario());
}

// GET /api/inventario/alertas
export async function alertas(_req: Request, res: Response) {
  res.json(await servicio.productosEnStockCritico());
}
