import type { Request, Response } from "express";
import * as servicio from "../services/movimientos.service";
import { entero, enteroObligatorio, opcion, textoObligatorio } from "../utils/validar";

// POST /api/movimientos   { idProducto, tipoMovimiento: "entrada" | "salida", cantidad, motivo }
export async function registrar(req: Request, res: Response) {
  const body = req.body ?? {};
  const resultado = await servicio.registrarMovimiento(
    {
      idProducto: enteroObligatorio(body.idProducto, "idProducto", 1),
      tipoMovimiento: opcion(body.tipoMovimiento, "tipoMovimiento", servicio.TIPOS_MOVIMIENTO),
      cantidad: enteroObligatorio(body.cantidad, "cantidad", 1),
      motivo: textoObligatorio(body.motivo, "motivo", 100),
    },
    req.usuario!.idUsuario, // el autor sale del token, no del cuerpo (RNF06)
  );
  res.status(201).json(resultado);
}

// GET /api/movimientos?producto=4&limite=50
export async function historial(req: Request, res: Response) {
  res.json(
    await servicio.historial({
      idProducto: entero(req.query.producto, "producto", { min: 1, opcional: true }),
      limite: Math.min(entero(req.query.limite, "limite", { min: 1, opcional: true }) ?? 50, 500),
    }),
  );
}
