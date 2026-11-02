import type { Request, Response } from "express";
import * as inventario from "../services/inventario.service";
import * as movimientos from "../services/movimientos.service";
import * as reportes from "../services/reportes.service";
import { TIPOS_MOVIMIENTO } from "../types/modelos";
import { ESTADOS_STOCK } from "../utils/estadoStock";
import { peticionInvalida } from "../utils/httpError";
import { enteroObligatorio, fechaIso, idDeCampo, opcion, opcionOpcional, paginacion, texto, textoObligatorio } from "../utils/validar";

/* Inventario (RF14) */

// GET /api/inventario?q=&categoria=&estado=critico&pagina=1&porPagina=10
export async function listar(req: Request, res: Response) {
  const q = req.query as Record<string, unknown>;
  res.json(
    await inventario.listarInventario({
      ...paginacion(q, 10),
      texto: texto(q["q"], "q", 100, true),
      idCategoria: idDeCampo(q["categoria"], "categoria", true),
      estado: opcionOpcional(q["estado"], "estado", ESTADOS_STOCK),
    }),
  );
}

export async function resumen(_req: Request, res: Response) {
  res.json(await inventario.resumenInventario());
}

export async function alertas(_req: Request, res: Response) {
  res.json(await inventario.productosEnStockCritico());
}

/* Movimientos (RF10–RF13) */

// POST /api/movimientos   { idProducto, tipoMovimiento: "entrada" | "salida", cantidad, motivo }
export async function registrar(req: Request, res: Response) {
  const b = req.body ?? {};
  const resultado = await movimientos.registrarMovimiento(
    {
      idProducto: idDeCampo(b.idProducto, "idProducto"),
      tipoMovimiento: opcion(b.tipoMovimiento, "tipoMovimiento", TIPOS_MOVIMIENTO),
      cantidad: enteroObligatorio(b.cantidad, "cantidad", 1, 100_000),
      motivo: textoObligatorio(b.motivo, "motivo", 100),
    },
    req.usuario!, // el autor sale de la sesión, no del cuerpo (RNF06)
  );
  res.status(201).json(resultado);
}

// GET /api/movimientos?producto=&tipo=salida&desde=2026-09-01&hasta=2026-10-19&pagina=1
export async function historial(req: Request, res: Response) {
  const q = req.query as Record<string, unknown>;
  const desde = fechaIso(q["desde"], "desde");
  const hasta = fechaIso(q["hasta"], "hasta");
  if (desde && hasta && desde > hasta) throw peticionInvalida("La fecha “Desde” no puede ser posterior a “Hasta”");
  res.json(
    await movimientos.historial({
      ...paginacion(q, 10),
      idProducto: idDeCampo(q["producto"], "producto", true),
      tipo: opcionOpcional(q["tipo"], "tipo", TIPOS_MOVIMIENTO),
      desde,
      hasta,
    }),
  );
}

/* Reportes */

export function listarReportes(_req: Request, res: Response) {
  res.json(reportes.listarReportes());
}

export async function ejecutarReporte(req: Request, res: Response) {
  res.json(await reportes.ejecutarReporte(String(req.params["id"]), req.query as Record<string, unknown>));
}
