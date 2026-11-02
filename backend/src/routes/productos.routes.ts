import { Router } from "express";
import * as c from "../controllers/productos.controller";
import { requiereSesion, soloAdmin } from "../middlewares/auth";

const r = Router();
// Catálogo público (no requiere sesión): RF01–RF04
r.get("/", c.listar);
r.get("/:id", c.ficha);
// Administración del catálogo: RF09
r.post("/", requiereSesion, soloAdmin, c.crear);
r.put("/:id", requiereSesion, soloAdmin, c.actualizar);
r.patch("/:id/baja", requiereSesion, soloAdmin, c.baja);
export default r;
