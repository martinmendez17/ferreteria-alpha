import { NavLink } from "react-router";
import { ChipAdmin } from "../../componentes/Ui";
import { useSesion } from "../../contexto/Sesion";
import { ENLACES, useTitulo } from "../../disenos/LayoutInterno";

/** Menú "Más" del celular: las opciones que no caben en la barra inferior. */
export function Mas() {
  useTitulo("Más opciones");
  const { usuario, esAdmin, salir } = useSesion();
  return (
    <div className="superficie">
      <div className="p-3 border-bottom">
        <div className="fw-bold">{usuario?.nombreCompleto}</div>
        <div className="texto-secundario small">{usuario?.email} · {usuario?.rol}</div>
      </div>
      <nav className="list-group list-group-flush" aria-label="Más opciones">
        {ENLACES.filter((e) => !e.admin || esAdmin).map((e) => (
          <NavLink key={e.a} to={e.a} end={e.fin} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3">
            {e.texto} {e.admin && <ChipAdmin />}
          </NavLink>
        ))}
        <NavLink to="/" className="list-group-item list-group-item-action py-3">Ver catálogo público</NavLink>
        <button type="button" className="list-group-item list-group-item-action py-3 text-danger fw-semibold" onClick={() => salir()}>Cerrar sesión</button>
      </nav>
    </div>
  );
}
