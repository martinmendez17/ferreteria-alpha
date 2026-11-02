import { Router } from "express";
import * as c from "../controllers/inventario.controller";
import { requiereSesion } from "../middlewares/auth";

const r = Router();
r.use(requiereSesion); // Empleado y Administrador
r.get("/", c.listar);
r.get("/resumen", c.resumen);
r.get("/alertas", c.alertas);
export default r;
