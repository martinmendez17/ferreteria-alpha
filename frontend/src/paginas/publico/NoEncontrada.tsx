import { useEffect } from "react";
import { Link } from "react-router";
import { IconoLupaVacia } from "../../componentes/Ui";

export function NoEncontrada() {
  useEffect(() => {
    document.title = "Página no encontrada · Ferretería Alpha";
  }, []);
  return (
    <div className="superficie vacio">
      <div className="icono-vacio"><IconoLupaVacia /></div>
      <h1 className="subtitulo mb-2">No encontramos esta página</h1>
      <p className="texto-secundario">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      <Link to="/" className="btn btn-primary">Ir al catálogo</Link>
    </div>
  );
}
