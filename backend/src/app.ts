import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { manejarErrores, rutaNoEncontrada } from "./middlewares/errores";
import { limiteGeneral } from "./middlewares/limites";
import api from "./routes";

export const app = express();

// Render (y otros servicios) ponen un proxy delante: así se lee la IP real del cliente
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet()); // encabezados de seguridad
app.use(
  cors({
    origin(origen, responder) {
      // Sin origen = herramientas como curl o Postman. Con origen, solo el frontend autorizado.
      if (!origen || env.frontendUrls.includes(origen)) responder(null, true);
      else responder(null, false);
    },
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.json({ nombre: "API Ferretería Alpha", version: "2.0.0", documentacion: "docs/API.md", salud: "/api/salud" });
});
app.use("/api", limiteGeneral, api);

app.use(rutaNoEncontrada);
app.use(manejarErrores);
