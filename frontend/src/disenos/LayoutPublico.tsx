import { useEffect, useState, type FormEvent } from "react";
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { Logo } from "../componentes/Ui";
import { useSesion } from "../contexto/Sesion";
import { TIENDA } from "../utils/tienda";

/** Zona pública (sin iniciar sesión): barra azul con buscador y botón "Acceso personal". */
export function LayoutPublico() {
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { usuario } = useSesion();
  const [texto, setTexto] = useState(params.get("q") ?? "");

  // Si cambia la búsqueda en la URL (por ejemplo, al limpiar filtros), se actualiza el campo
  useEffect(() => {
    setTexto(params.get("q") ?? "");
  }, [params]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  function buscar(e: FormEvent) {
    e.preventDefault();
    const q = texto.trim();
    navegar(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

  return (
    <>
      <header className="barra-publica">
        <div className="container-xxl d-flex align-items-center gap-3 gap-lg-4 flex-wrap flex-md-nowrap">
          <Logo />
          <form className="buscador order-3 order-md-2 w-100" role="search" onSubmit={buscar}>
            <label htmlFor="buscar" className="visualmente-oculto">Buscar productos</label>
            <input
              id="buscar"
              className="form-control"
              type="search"
              placeholder="Buscar por nombre, código o palabra clave…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={100}
            />
            <button className="btn btn-primary" type="submit">Buscar</button>
          </form>
          <Link to={usuario ? "/panel" : "/login"} className="btn btn-acceso ms-auto order-2 order-md-3 text-nowrap">
            {usuario ? "Ir al panel" : "Acceso personal"}
          </Link>
        </div>
      </header>
      <main className="container-xxl py-4">
        <Outlet />
      </main>
      <footer className="border-top bg-white mt-4">
        <div className="container-xxl py-4 d-flex flex-wrap justify-content-between gap-2 texto-secundario">
          <span>Ferretería Alpha · {TIENDA.direccion} · {TIENDA.horario}</span>
          <a href={TIENDA.telefonoEnlace}>{TIENDA.telefono}</a>
        </div>
      </footer>
    </>
  );
}
