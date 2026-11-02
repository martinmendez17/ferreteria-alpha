import { Router } from "express";
import * as c from "../controllers/proveedores.controller";
import { requiereSesion, soloAdmin } from "../middlewares/auth";

const r = Router();
r.use(requiereSesion);
r.get("/", c.listar);
r.post("/", soloAdmin, c.crear);
r.delete("/:id", soloAdmin, c.eliminar);
export default r;
