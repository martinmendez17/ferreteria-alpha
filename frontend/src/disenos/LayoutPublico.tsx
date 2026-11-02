import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { Logo } from "../componentes/Ui";
import { useSesion } from "../contexto/Sesion";
import { TIENDA } from "../utils/tienda";

/** Zona pública (sin iniciar sesión): barra azul con el logo y el botón "Acceso personal". El buscador está en el panel de filtros del catálogo. */
export function LayoutPublico() {
  const { pathname } = useLocation();
  const { usuario } = useSesion();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <header className="barra-publica">
        <div className="container-xxl d-flex align-items-center gap-3">
          <Logo />
          <Link to={usuario ? "/panel" : "/login"} className="btn btn-acceso ms-auto text-nowrap">
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
