import { Router } from "express";
import auth from "./auth.routes";
import categorias from "./categorias.routes";
import inventario from "./inventario.routes";
import movimientos from "./movimientos.routes";
import productos from "./productos.routes";
import proveedores from "./proveedores.routes";
import salud from "./salud.routes";
import usuarios from "./usuarios.routes";

// Punto único donde se montan todos los recursos de la API REST
const api = Router();
api.use("/salud", salud);
api.use("/auth", auth);
api.use("/productos", productos);
api.use("/categorias", categorias);
api.use("/proveedores", proveedores);
api.use("/inventario", inventario);
api.use("/movimientos", movimientos);
api.use("/usuarios", usuarios);

export default api;
