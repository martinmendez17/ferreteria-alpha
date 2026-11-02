import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import * as cat from "../controllers/catalogos.controller";
import * as inv from "../controllers/inventario.controller";
import * as prod from "../controllers/productos.controller";
import { salud } from "../controllers/salud.controller";
import * as usu from "../controllers/usuarios.controller";
import { requiereSesion, soloAdmin } from "../middlewares/auth";
import { limiteLogin, limiteRecuperacion } from "../middlewares/limites";

/*
 * Todas las rutas de la API REST en un solo lugar.
 *   Público          -> cualquiera, sin iniciar sesión
 *   Sesión           -> Empleado o Administrador (token JWT)
 *   Administrador    -> solo Administrador
 */
const api = Router();

// Estado del servicio
api.get("/salud", salud);

// Autenticación (RF05–RF08)
api.post("/auth/login", limiteLogin, auth.login);
api.get("/auth/perfil", requiereSesion, auth.perfil);
api.post("/auth/recuperar", limiteRecuperacion, auth.recuperar);
api.post("/auth/restablecer", limiteRecuperacion, auth.restablecer);

// Catálogo público (RF01–RF04)
api.get("/productos", prod.catalogo);
api.get("/categorias", cat.listarCategorias);

// Administración de productos (RF09). Van antes de /productos/:id para que "admin" no se lea como id.
api.get("/productos/admin/lista", requiereSesion, soloAdmin, prod.listaAdmin);
api.get("/productos/admin/:id", requiereSesion, soloAdmin, prod.detalleAdmin);
api.get("/productos/:id", prod.ficha);
api.post("/productos", requiereSesion, soloAdmin, prod.crear);
api.put("/productos/:id", requiereSesion, soloAdmin, prod.actualizar);
api.patch("/productos/:id/estado", requiereSesion, soloAdmin, prod.cambiarEstado);

// Categorías y proveedores (RF15)
api.post("/categorias", requiereSesion, soloAdmin, cat.crearCategoria);
api.put("/categorias/:id", requiereSesion, soloAdmin, cat.actualizarCategoria);
api.delete("/categorias/:id", requiereSesion, soloAdmin, cat.eliminarCategoria);
api.get("/proveedores", requiereSesion, cat.listarProveedores);
api.post("/proveedores", requiereSesion, soloAdmin, cat.crearProveedor);
api.put("/proveedores/:id", requiereSesion, soloAdmin, cat.actualizarProveedor);
api.delete("/proveedores/:id", requiereSesion, soloAdmin, cat.eliminarProveedor);

// Inventario y movimientos (RF10–RF14)
api.get("/inventario", requiereSesion, inv.listar);
api.get("/inventario/resumen", requiereSesion, inv.resumen);
api.get("/inventario/alertas", requiereSesion, inv.alertas);
api.get("/movimientos", requiereSesion, inv.historial);
api.post("/movimientos", requiereSesion, inv.registrar);

// Reportes: consultas con $lookup (JOIN), $group (GROUP BY) y operadores
api.get("/reportes", requiereSesion, inv.listarReportes);
api.get("/reportes/:id", requiereSesion, inv.ejecutarReporte);

// Usuarios (RF16)
api.get("/usuarios", requiereSesion, soloAdmin, usu.listar);
api.post("/usuarios", requiereSesion, soloAdmin, usu.crear);
api.put("/usuarios/:id", requiereSesion, soloAdmin, usu.actualizar);
api.patch("/usuarios/:id/estado", requiereSesion, soloAdmin, usu.cambiarEstado);

export default api;
