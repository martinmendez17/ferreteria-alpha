import { Router } from "express";
import * as c from "../controllers/usuarios.controller";
import { requiereSesion, soloAdmin } from "../middlewares/auth";

const r = Router();
r.use(requiereSesion, soloAdmin); // RF16: solo Administrador
r.get("/", c.listar);
r.post("/", c.crear);
r.patch("/:id/estado", c.cambiarEstado);
export default r;
