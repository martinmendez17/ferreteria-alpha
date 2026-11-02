import { Router } from "express";
import * as c from "../controllers/movimientos.controller";
import { requiereSesion } from "../middlewares/auth";

const r = Router();
r.use(requiereSesion); // Empleado y Administrador
r.get("/", c.historial);
r.post("/", c.registrar);
export default r;
