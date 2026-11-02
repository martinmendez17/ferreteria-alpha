import { Router } from "express";
import { salud } from "../controllers/salud.controller";

const r = Router();
r.get("/", salud);
export default r;
