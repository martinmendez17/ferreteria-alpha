import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../api/cliente";
import type { FichaProducto } from "../../api/tipos";
import { ImagenProducto } from "../../componentes/ImagenProducto";
import { Aviso, ErrorCarga, EtiquetaDisponibilidad, IconoLupaVacia } from "../../componentes/Ui";
import { dinero } from "../../utils/formato";
import { TIENDA } from "../../utils/tienda";
import { usarDatos } from "../../utils/usarDatos";
import { TarjetaProducto } from "./Catalogo";

const TEXTO_DISPONIBILIDAD = {
  disponible: "Hay stock en tienda",
  ultimas_unidades: "Quedan pocas unidades: te recomendamos llamar antes de venir",
  sin_stock: "Sin stock por ahora. Llámanos para saber cuándo llega",
};

/** RF04: ficha del producto con precio, disponibilidad y productos de la misma categoría. */
export function Ficha() {
  const { id = "" } = useParams();
  const navegar = useNavigate();
  const { datos: p, cargando, error, estadoError, recargar } = usarDatos((signal) => api<FichaProducto>(`/productos/${id}`, { signal }), [id]);

  useEffect(() => {
    if (p) document.title = `${p.nombre} · Ferretería Alpha`;
  }, [p]);

  const volver = () => (window.history.length > 1 ? navegar(-1) : navegar("/"));

  if (cargando && !p) {
    return (
      <div className="superficie p-4">
        <div className="row g-4">
          <div className="col-md-5"><div className="esqueleto" style={{ aspectRatio: "4/3" }} /></div>
          <div className="col-md-7"><div className="esqueleto mb-3" style={{ height: 40 }} /><div className="esqueleto" style={{ height: 200 }} /></div>
        </div>
      </div>
    );
  }

  if (error || !p) {
    const noExiste = estadoError === 404 || estadoError === 400;
    return noExiste ? (
      <div className="superficie vacio">
        <div className="icono-vacio"><IconoLupaVacia /></div>
        <h1 className="subtitulo mb-2">Este producto no existe o ya no está a la venta</h1>
        <p className="texto-secundario">Puede que lo hayamos dejado de vender. Revisa el catálogo para ver alternativas.</p>
        <Link to="/" className="btn btn-primary">Ver el catálogo</Link>
      </div>
    ) : (
      <ErrorCarga mensaje={error ?? "Sin datos"} alReintentar={recargar} />
    );
  }

  return (
    <>
      <nav className="migas mb-3" aria-label="Ruta">
        <Link to="/">Inicio</Link> › <Link to="/">Catálogo</Link> ›{" "}
        <Link to={`/?cat=${p.categoria._id}`}>{p.categoria.nombre}</Link> › <span className="actual">{p.nombre}</span>
      </nav>

      <article className="superficie p-3 p-md-4">
        <div className="row g-4">
          <div className="col-md-5">
            <div className="imagen-ficha"><ImagenProducto url={p.imagenUrl} alt={p.nombre} /></div>
          </div>
          <div className="col-md-7">
            <div className="d-flex flex-wrap gap-2 mb-3">
              <EtiquetaDisponibilidad valor={p.disponibilidad} />
              <Link to={`/?cat=${p.categoria._id}`} className="estado estado-info estado-sin-punto text-decoration-none">{p.categoria.nombre}</Link>
            </div>
            <h1 className="titulo titulo-ficha">{p.nombre}</h1>
            <p className="texto-secundario mt-2 mb-3" style={{ fontSize: "1rem" }}>
              SKU <span className="codigo">{p.sku}</span>
              {p.marca && <> · Marca: {p.marca}</>} · Unidad de venta: {p.unidadMedida}
            </p>
            <div className="precio-grande tabular mb-3">{dinero(p.precioVenta)}</div>
            {p.descripcion && <p style={{ fontSize: "1rem" }}>{p.descripcion}</p>}

            <dl className="tabla-datos my-4" style={{ maxWidth: "36rem" }}>
              <div><dt>Disponibilidad</dt><dd className="fw-semibold">{TEXTO_DISPONIBILIDAD[p.disponibilidad]}</dd></div>
              <div><dt>Retiro</dt><dd>{TIENDA.direccion} · {TIENDA.horario}</dd></div>
            </dl>

            <div className="d-flex flex-column flex-sm-row gap-2">
              <a href={TIENDA.telefonoEnlace} className="btn btn-primary btn-lg">Consultar por teléfono</a>
              <button type="button" className="btn btn-secundario btn-lg" onClick={volver}>‹ Volver al catálogo</button>
            </div>
          </div>
        </div>
      </article>

      {p.disponibilidad === "sin_stock" && (
        <Aviso tipo="info" className="mt-3">Llámanos al {TIENDA.telefono} y te avisamos cuando vuelva a llegar.</Aviso>
      )}

      {p.relacionados.length > 0 && (
        <section className="mt-4">
          <h2 className="subtitulo mb-3">Productos de la misma categoría</h2>
          <div className="row g-3">
            {p.relacionados.map((r) => (
              <div className="col-12 col-md-4" key={r._id}><TarjetaProducto p={r} compacta /></div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
