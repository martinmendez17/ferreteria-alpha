import { Router } from "express";
import { login, perfil } from "../controllers/auth.controller";
import { requiereSesion } from "../middlewares/auth";

const r = Router();
r.post("/login", login);
r.get("/perfil", requiereSesion, perfil);
export default r;
