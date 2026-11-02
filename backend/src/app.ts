import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { manejarErrores, rutaNoEncontrada } from "./middlewares/errores";
import api from "./routes";

export const app = express();

app.use(cors({ origin: env.frontendUrl }));
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.json({ nombre: "API Ferretería Alpha", documentacion: "Ver README.md", salud: "/api/salud" });
});
app.use("/api", api);

app.use(rutaNoEncontrada);
app.use(manejarErrores);
