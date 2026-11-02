import { Route, Routes } from "react-router";
import { LayoutInterno, SoloAdmin } from "./disenos/LayoutInterno";
import { LayoutPublico } from "./disenos/LayoutPublico";
import { CategoriasProveedores } from "./paginas/interno/CategoriasProveedores";
import { Historial } from "./paginas/interno/Historial";
import { Inventario } from "./paginas/interno/Inventario";
import { Mas } from "./paginas/interno/Mas";
import { Productos } from "./paginas/interno/Productos";
import { Reportes } from "./paginas/interno/Reportes";
import { Usuarios } from "./paginas/interno/Usuarios";
import { Catalogo } from "./paginas/publico/Catalogo";
import { Ficha } from "./paginas/publico/Ficha";
import { Login } from "./paginas/publico/Login";
import { NoEncontrada } from "./paginas/publico/NoEncontrada";
import { Recuperar, Restablecer } from "./paginas/publico/Recuperar";

/* Mapa de navegación (boceto "navegación"): zona pública y zona interna. */
export function App() {
  return (
    <Routes>
      <Route element={<LayoutPublico />}>
        <Route index element={<Catalogo />} />
        <Route path="producto/:id" element={<Ficha />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
      <Route path="login" element={<Login />} />
      <Route path="recuperar" element={<Recuperar />} />
      <Route path="restablecer" element={<Restablecer />} />

      <Route path="panel" element={<LayoutInterno />}>
        <Route index element={<Inventario />} />
        <Route path="historial" element={<Historial />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="productos" element={<SoloAdmin><Productos /></SoloAdmin>} />
        <Route path="categorias" element={<SoloAdmin><CategoriasProveedores /></SoloAdmin>} />
        <Route path="usuarios" element={<SoloAdmin><Usuarios /></SoloAdmin>} />
        <Route path="mas" element={<Mas />} />
      </Route>
    </Routes>
  );
}
