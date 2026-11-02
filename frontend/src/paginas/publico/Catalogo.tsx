import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../api/cliente";
import type { Categoria, Paginado, ProductoPublico } from "../../api/tipos";
import { ImagenProducto } from "../../componentes/ImagenProducto";
import { Aviso, ErrorCarga, EtiquetaDisponibilidad, IconoLupaVacia, Paginacion } from "../../componentes/Ui";
import { dinero, numero } from "../../utils/formato";
import { TIENDA } from "../../utils/tienda";
import { usarDatos } from "../../utils/usarDatos";

const ORDENES = [
  { valor: "nombre_asc", texto: "Nombre (A–Z)" },
  { valor: "nombre_desc", texto: "Nombre (Z–A)" },
  { valor: "precio_asc", texto: "Precio: menor a mayor" },
  { valor: "precio_desc", texto: "Precio: mayor a menor" },
];
const POR_PAGINA = 8;

const soloDigitos = (t: string) => t.replace(/\D/g, "").slice(0, 9);
const formatoPrecio = (t: string) => (t ? `$${numero(Number(t))}` : "");

/** RF01–RF03: catálogo con búsqueda, filtros por categoría, precio y stock, orden y paginación.
 *  La búsqueda está en el mismo panel que los filtros: se aplica con Enter o con "Aplicar filtros". */
export function Catalogo() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const cats = useMemo(() => (params.get("cat") ?? "").split(",").filter(Boolean), [params]);
  const min = params.get("min") ?? "";
  const max = params.get("max") ?? "";
  const soloStock = params.get("stock") === "1";
  const orden = params.get("orden") ?? "nombre_asc";
  const pagina = Number(params.get("pagina") ?? 1) || 1;

  // Filtros "en edición": se aplican al presionar "Aplicar filtros"
  const [borrador, setBorrador] = useState({ q, cats, min, max, soloStock });
  const [panelMovil, setPanelMovil] = useState(false);
  useEffect(() => {
    setBorrador({ q, cats, min, max, soloStock });
  }, [q, cats, min, max, soloStock]);

  useEffect(() => {
    document.title = q ? `“${q}” · Ferretería Alpha` : "Catálogo · Ferretería Alpha";
  }, [q]);

  const categorias = usarDatos((signal) => api<Categoria[]>("/categorias", { signal }), []);
  const productos = usarDatos(
    (signal) =>
      api<Paginado<ProductoPublico>>("/productos", {
        signal,
        consulta: { q, categorias: cats.join(","), precioMin: min, precioMax: max, soloStock: soloStock || undefined, orden, pagina, porPagina: POR_PAGINA },
      }),
    [q, cats.join(","), min, max, soloStock, orden, pagina],
  );

  function cambiar(cambios: Record<string, string | null>) {
    const nuevos = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) nuevos.set(k, v);
      else nuevos.delete(k);
    }
    if (!("pagina" in cambios)) nuevos.delete("pagina");
    setParams(nuevos);
  }

  function aplicar(e?: FormEvent) {
    e?.preventDefault();
    const minN = borrador.min, maxN = borrador.max;
    // Si el rango viene al revés, se ordena solo
    const [a, b] = minN && maxN && Number(minN) > Number(maxN) ? [maxN, minN] : [minN, maxN];
    cambiar({ q: borrador.q.trim() || null, cat: borrador.cats.join(",") || null, min: a || null, max: b || null, stock: borrador.soloStock ? "1" : null });
    setPanelMovil(false);
  }

  function limpiar() {
    setParams(orden !== "nombre_asc" ? { orden } : {});
    setPanelMovil(false);
  }

  const filtrosActivos = (q ? 1 : 0) + cats.length + (min ? 1 : 0) + (max ? 1 : 0) + (soloStock ? 1 : 0);
  const listaCategorias = (categorias.datos ?? []).filter((c) => c.productosActivos > 0 || cats.includes(c._id));
  const datos = productos.datos;

  const panelFiltros = (
    <form className="panel-filtros" role="search" onSubmit={aplicar}>
      <label htmlFor="buscar" className="etiqueta d-block mb-2">Buscar</label>
      <div className="buscador-filtros mb-4">
        <input
          id="buscar"
          className="form-control"
          type="search"
          placeholder="Nombre, código, marca…"
          value={borrador.q}
          onChange={(e) => setBorrador((b) => ({ ...b, q: e.target.value }))}
          maxLength={100}
        />
      </div>

      <div className="etiqueta mb-3">Categorías</div>
      {categorias.cargando && <div className="esqueleto mb-2" style={{ height: 120 }} />}
      {listaCategorias.map((c) => (
        <div className="form-check" key={c._id}>
          <input
            className="form-check-input"
            type="checkbox"
            id={`cat-${c._id}`}
            checked={borrador.cats.includes(c._id)}
            onChange={(e) =>
              setBorrador((b) => ({ ...b, cats: e.target.checked ? [...b.cats, c._id] : b.cats.filter((x) => x !== c._id) }))
            }
          />
          <label className="form-check-label" htmlFor={`cat-${c._id}`}>
            {c.nombre} <span className="texto-secundario">({c.productosActivos})</span>
          </label>
        </div>
      ))}

      <div className="etiqueta mt-4 mb-2">Rango de precio</div>
      <div className="d-flex gap-2">
        <input className="form-control" inputMode="numeric" placeholder="$ mínimo" aria-label="Precio mínimo"
          value={formatoPrecio(borrador.min)} onChange={(e) => setBorrador((b) => ({ ...b, min: soloDigitos(e.target.value) }))} />
        <input className="form-control" inputMode="numeric" placeholder="$ máximo" aria-label="Precio máximo"
          value={formatoPrecio(borrador.max)} onChange={(e) => setBorrador((b) => ({ ...b, max: soloDigitos(e.target.value) }))} />
      </div>

      <div className="etiqueta mt-4 mb-2">Disponibilidad</div>
      <div className="form-check form-switch d-flex justify-content-between align-items-center ps-0">
        <label className="form-check-label" htmlFor="solo-stock">Solo con stock</label>
        <input className="form-check-input ms-0" type="checkbox" role="switch" id="solo-stock" checked={borrador.soloStock}
          onChange={(e) => setBorrador((b) => ({ ...b, soloStock: e.target.checked }))} />
      </div>

      <div className="d-flex gap-2 mt-4">
        <button type="submit" className="btn btn-primary flex-grow-1">Aplicar filtros</button>
        <button type="button" className="btn btn-secundario" onClick={limpiar}>Limpiar</button>
      </div>
    </form>
  );

  return (
    <div className="row g-4">
      <aside className="col-lg-3 d-none d-lg-block">{panelFiltros}</aside>

      {panelMovil && (
        <div className="fondo-modal p-0" onMouseDown={(e) => e.target === e.currentTarget && setPanelMovil(false)}>
          <div className="panel-lateral" role="dialog" aria-modal="true" aria-label="Buscar y filtrar">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="subtitulo">Buscar y filtrar</h2>
              <button type="button" className="btn-cerrar" aria-label="Cerrar filtros" onClick={() => setPanelMovil(false)}>×</button>
            </div>
            {panelFiltros}
          </div>
        </div>
      )}

      <section className="col-lg-9">
        <nav className="migas mb-2" aria-label="Ruta">
          <Link to="/">Inicio</Link> › {q ? <><Link to="/">Catálogo</Link> › <span className="actual">Resultados de búsqueda</span></> : <span className="actual">Catálogo</span>}
        </nav>

        <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
          <div>
            <h1 className="titulo">{q ? `“${q}”` : "Catálogo de productos"}</h1>
            <div className="texto-secundario mt-1" aria-live="polite">
              {datos ? (
                <>
                  {datos.total} {datos.total === 1 ? "producto" : "productos"}
                  {datos.total > 0 && ` · mostrando ${(datos.pagina - 1) * datos.porPagina + 1}–${Math.min(datos.pagina * datos.porPagina, datos.total)}`}
                  {filtrosActivos > 0 && ` · filtros activos: ${filtrosActivos}`}
                </>
              ) : "Buscando…"}
            </div>
          </div>
          <div className="d-flex gap-2 align-items-center col-12 col-md-auto">
            <button type="button" className="btn btn-secundario d-lg-none flex-grow-1" onClick={() => setPanelMovil(true)}>
              Buscar y filtrar{filtrosActivos > 0 ? ` (${filtrosActivos})` : ""}
            </button>
            <label htmlFor="orden" className="texto-secundario text-nowrap d-none d-md-inline ms-auto">Ordenar por</label>
            <select id="orden" className="form-select w-auto flex-grow-1 flex-md-grow-0" value={orden} onChange={(e) => cambiar({ orden: e.target.value })}>
              {ORDENES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </div>
        </div>

        {productos.error && <ErrorCarga mensaje={productos.error} alReintentar={productos.recargar} />}

        {productos.cargando && !datos && (
          <div className="row g-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div className="col-12 col-sm-6 col-xl-3" key={i}><div className="esqueleto" style={{ height: 300 }} /></div>
            ))}
          </div>
        )}

        {datos && datos.total === 0 && (
          <>
            <div className="superficie vacio">
              <div className="icono-vacio"><IconoLupaVacia /></div>
              <h2 className="subtitulo mb-2">No encontramos productos con esa búsqueda</h2>
              <p className="texto-secundario mx-auto" style={{ maxWidth: "32rem" }}>
                Revisa cómo está escrita la palabra, prueba con otra palabra más corta o quita algunos filtros.
              </p>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                {filtrosActivos > 0 && <button type="button" className="btn btn-primary" onClick={limpiar}>Limpiar filtros</button>}
                <Link to="/" className={`btn ${filtrosActivos > 0 ? "btn-secundario" : "btn-primary"}`}>Ver todo el catálogo</Link>
              </div>
            </div>
            <Aviso tipo="info" className="mt-3">
              ¿Buscas algo que no está en el catálogo? Llámanos al <a href={TIENDA.telefonoEnlace} className="fw-bold">{TIENDA.telefono}</a> y te decimos si podemos conseguirlo.
            </Aviso>
          </>
        )}

        {datos && datos.total > 0 && (
          <div style={{ opacity: productos.cargando ? 0.55 : 1, transition: "opacity .15s" }}>
            <div className="row g-3">
              {datos.datos.map((p) => (
                <div className="col-12 col-sm-6 col-xl-3" key={p._id}>
                  <TarjetaProducto p={p} />
                </div>
              ))}
            </div>
            <div className="d-flex justify-content-center mt-4">
              <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} alCambiar={(p) => { cambiar({ pagina: String(p) }); window.scrollTo(0, 0); }} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function TarjetaProducto({ p, compacta = false }: { p: ProductoPublico; compacta?: boolean }) {
  return (
    <article className="tarjeta-producto">
      <div className="imagen"><ImagenProducto url={p.imagenUrl} alt="" /></div>
      <div className="cuerpo">
        {!compacta && <div><EtiquetaDisponibilidad valor={p.disponibilidad} /></div>}
        <Link to={`/producto/${p._id}`} className="nombre">{p.nombre}</Link>
        {!compacta && <div className="texto-secundario small sku codigo">SKU {p.sku}</div>}
        <div className="pie">
          <span className="precio tabular">{dinero(p.precioVenta)}</span>
          {compacta ? <EtiquetaDisponibilidad valor={p.disponibilidad} /> : <span className="btn btn-secundario btn-sm btn-ficha" aria-hidden="true">Ver ficha</span>}
        </div>
      </div>
    </article>
  );
}
