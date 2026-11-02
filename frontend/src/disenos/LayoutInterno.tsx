import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router";
import { ChipAdmin, Logo } from "../componentes/Ui";
import { useSesion } from "../contexto/Sesion";
import { iniciales } from "../utils/formato";

const ContextoTitulo = createContext<(t: string) => void>(() => {});

/** Cada pantalla interna fija su título (cabecera y pestaña del navegador). */
export function useTitulo(titulo: string) {
  const fijar = useContext(ContextoTitulo);
  useEffect(() => {
    fijar(titulo);
    document.title = `${titulo} · Ferretería Alpha`;
  }, [titulo, fijar]);
}

export const ENLACES = [
  { a: "/panel", texto: "Inventario", admin: false, fin: true },
  { a: "/panel/historial", texto: "Historial de movimientos", admin: false },
  { a: "/panel/reportes", texto: "Reportes", admin: false },
  { a: "/panel/productos", texto: "Productos", admin: true },
  { a: "/panel/categorias", texto: "Categorías y proveedores", admin: true },
  { a: "/panel/usuarios", texto: "Usuarios y roles", admin: true },
];

/** Zona interna (requiere sesión): menú lateral en computador y barra inferior en celular. */
export function LayoutInterno() {
  const { usuario, esAdmin, salir } = useSesion();
  const ubicacion = useLocation();
  const [titulo, setTitulo] = useState("Panel");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ubicacion.pathname]);

  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  const enlaces = ENLACES.filter((e) => !e.admin || esAdmin);

  return (
    <ContextoTitulo.Provider value={setTitulo}>
      <div className="zona-interna">
        <aside className="menu-lateral">
          <div className="mb-4 px-2"><Logo a="/panel" /></div>
          <nav aria-label="Menú principal">
            {enlaces.map((e) => (
              <NavLink key={e.a} to={e.a} end={e.fin}>
                <span>{e.texto}</span>
                {e.admin && <ChipAdmin />}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto">
            <NavLink to="/" className="d-block px-3 py-2 text-white-50 text-decoration-none small">Ver catálogo público ↗</NavLink>
            <button type="button" className="btn-salir" onClick={() => salir()}>Cerrar sesión</button>
          </div>
        </aside>

        <div className="contenido-interno">
          <header className="cabecera-interna">
            <h1 className="subtitulo" style={{ fontSize: "1.375rem" }}>{titulo}</h1>
            <div className="d-flex align-items-center gap-3">
              <div className="text-end datos-usuario">
                <div className="fw-semibold">{usuario.nombreCompleto}</div>
                <div className="texto-secundario small">{usuario.rol}</div>
              </div>
              <span className="avatar" title={`${usuario.nombreCompleto} · ${usuario.rol}`}>{iniciales(usuario.nombreCompleto)}</span>
            </div>
          </header>
          <main className="cuerpo-interno">
            <Outlet />
          </main>
        </div>

        <nav className="navegacion-inferior" aria-label="Menú">
          <NavLink to="/panel" end>Inventario</NavLink>
          <NavLink to="/panel/historial">Historial</NavLink>
          {esAdmin ? <NavLink to="/panel/productos">Productos</NavLink> : <NavLink to="/panel/reportes">Reportes</NavLink>}
          <NavLink to="/panel/mas">Más</NavLink>
        </nav>
      </div>
    </ContextoTitulo.Provider>
  );
}

/** Pantallas solo para el Administrador. Un Empleado que entra por la URL ve un aviso. */
export function SoloAdmin({ children }: { children: ReactNode }) {
  const { esAdmin } = useSesion();
  return esAdmin ? <>{children}</> : <SinPermiso />;
}

function SinPermiso() {
  useTitulo("Sin permiso");
  return (
    <div className="superficie vacio">
      <h2 className="subtitulo mb-2">Esta sección es solo para el Administrador</h2>
      <p className="texto-secundario">Tu cuenta de Empleado puede registrar entradas y salidas, ver el historial y los reportes.</p>
      <NavLink to="/panel" className="btn btn-primary">Ir al inventario</NavLink>
    </div>
  );
}
