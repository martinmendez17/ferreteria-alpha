import { Router } from "express";
import * as c from "../controllers/categorias.controller";
import { requiereSesion, soloAdmin } from "../middlewares/auth";

const r = Router();
r.get("/", c.listar); // pública: la usa el filtro del catálogo
r.post("/", requiereSesion, soloAdmin, c.crear);
r.delete("/:id", requiereSesion, soloAdmin, c.eliminar);
export default r;
