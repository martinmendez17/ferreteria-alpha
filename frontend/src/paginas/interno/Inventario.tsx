import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../api/cliente";
import type { Categoria, EstadoStock, FilaInventario, Paginado, ResultadoMovimiento, ResumenInventario, TipoMovimiento } from "../../api/tipos";
import { FormProducto } from "../../componentes/FormProducto";
import { ModalMovimiento } from "../../componentes/ModalMovimiento";
import { Aviso, ChipAdmin, ErrorCarga, EtiquetaEstado, Kpi, Paginacion } from "../../componentes/Ui";
import { useAvisos } from "../../contexto/Avisos";
import { useSesion } from "../../contexto/Sesion";
import { useTitulo } from "../../disenos/LayoutInterno";
import { hora, numero, plural } from "../../utils/formato";
import { usarDatos, usarRetraso } from "../../utils/usarDatos";

const POR_PAGINA = 10;

/** RF14: panel de inventario con indicadores, alertas y registro de entradas y salidas. */
export function Inventario() {
  useTitulo("Gestión de inventario");
  const { esAdmin } = useSesion();
  const { avisar } = useAvisos();

  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState<"" | EstadoStock>("");
  const [pagina, setPagina] = useState(1);
  const [movimiento, setMovimiento] = useState<{ producto: FilaInventario; tipo: TipoMovimiento } | null>(null);
  const [nuevoProducto, setNuevoProducto] = useState(false);
  const [resaltado, setResaltado] = useState<string | null>(null);
  const busqueda = usarRetraso(texto.trim());

  const resumen = usarDatos((signal) => api<ResumenInventario>("/inventario/resumen", { signal }), []);
  const categorias = usarDatos((signal) => api<Categoria[]>("/categorias", { signal }), []);
  const tabla = usarDatos(
    (signal) => api<Paginado<FilaInventario>>("/inventario", { signal, consulta: { q: busqueda, categoria, estado, pagina, porPagina: POR_PAGINA } }),
    [busqueda, categoria, estado, pagina],
  );

  function alRegistrar(r: ResultadoMovimiento) {
    const m = r.movimiento;
    setMovimiento(null);
    avisar({
      tipo: r.alertaStockMinimo ? "atencion" : "exito",
      titulo: m.tipoMovimiento === "salida" ? "Salida registrada" : "Entrada registrada",
      mensaje: (
        <>
          {numero(m.cantidad)} {plural(m.cantidad, r.producto.unidadMedida)} de {r.producto.nombre}. Stock actual: <strong>{numero(r.stockActual)}</strong>.
          {r.alertaStockMinimo && <> Quedó {r.estadoStock === "sin_stock" ? "sin stock" : "en o bajo su mínimo"}.</>}
        </>
      ),
      detalle: `Registrada por ${m.usuario.nombreCompleto} · hoy ${hora(m.fechaHora)}`,
    });
    setResaltado(r.producto._id);
    setTimeout(() => setResaltado(null), 4000);
    tabla.recargar();
    resumen.recargar();
  }

  const datos = tabla.datos;
  const filtrar = <T,>(fijar: (v: T) => void) => (v: T) => { fijar(v); setPagina(1); };

  const acciones = (p: FilaInventario, movil = false) => (
    <div className={`d-flex gap-2 align-items-center ${movil ? "" : "flex-nowrap"}`}>
      <button type="button" className={`btn btn-secundario btn-sm ${movil ? "flex-grow-1" : ""}`} onClick={() => setMovimiento({ producto: p, tipo: "entrada" })}
        aria-label={`Registrar entrada de ${p.nombre}`}>+ Entrada</button>
      <button type="button" className={`btn btn-secundario btn-sm ${movil ? "flex-grow-1" : ""}`} onClick={() => setMovimiento({ producto: p, tipo: "salida" })}
        disabled={p.inventario.stockActual === 0} title={p.inventario.stockActual === 0 ? "No hay stock para sacar" : undefined}
        aria-label={`Registrar salida de ${p.nombre}`}>− Salida</button>
      {!movil && <Link to={`/panel/historial?producto=${p._id}`} className="fw-semibold text-decoration-none ms-2">Historial</Link>}
    </div>
  );

  return (
    <>
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4"><Kpi etiqueta="Productos activos" valor={resumen.datos ? numero(resumen.datos.productosActivos) : "—"} /></div>
        <div className="col-6 col-md-4">
          <Kpi etiqueta="En stock crítico o sin stock" valor={resumen.datos ? numero(resumen.datos.enStockCritico) : "—"} alerta={!!resumen.datos?.enStockCritico} />
        </div>
        <div className="col-6 col-md-4"><Kpi etiqueta="Movimientos hoy" valor={resumen.datos ? numero(resumen.datos.movimientosHoy) : "—"} /></div>
      </div>

      {!!resumen.datos?.enStockCritico && (
        <Aviso tipo="atencion" className="mb-3">
          <strong>{resumen.datos.enStockCritico} {resumen.datos.enStockCritico === 1 ? "producto está" : "productos están"} en o bajo su stock mínimo.</strong>{" "}
          Aparecen primero en la tabla.{" "}
          <button type="button" className="btn-enlace" onClick={() => filtrar(setEstado)("critico")}>Ver solo los críticos</button>
        </Aviso>
      )}

      <section className="superficie">
        <div className="barra-herramientas">
          <input className="form-control flex-grow-1" style={{ minWidth: "14rem", flexBasis: "18rem" }} type="search" placeholder="Buscar por nombre o SKU…"
            aria-label="Buscar producto" value={texto} onChange={(e) => { setTexto(e.target.value); setPagina(1); }} />
          <select className="form-select w-auto" aria-label="Filtrar por categoría" value={categoria} onChange={(e) => filtrar(setCategoria)(e.target.value)}>
            <option value="">Categoría: todas</option>
            {categorias.datos?.filter((c) => c.productosActivos > 0).map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
          </select>
          <select className="form-select w-auto" aria-label="Filtrar por estado" value={estado} onChange={(e) => filtrar(setEstado)(e.target.value as EstadoStock | "")}>
            <option value="">Estado: todos</option>
            <option value="sin_stock">Sin stock</option>
            <option value="critico">Crítico</option>
            <option value="normal">Normal</option>
          </select>
          {esAdmin && (
            <button type="button" className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setNuevoProducto(true)}>
              + Nuevo producto <ChipAdmin />
            </button>
          )}
        </div>

        {tabla.error && <ErrorCarga mensaje={tabla.error} alReintentar={tabla.recargar} />}
        {datos && datos.total === 0 && (
          <div className="vacio">
            <h2 className="subtitulo mb-2">No hay productos que coincidan</h2>
            <p className="texto-secundario">Prueba con otra búsqueda o quita los filtros.</p>
            <button type="button" className="btn btn-secundario" onClick={() => { setTexto(""); setCategoria(""); setEstado(""); setPagina(1); }}>Quitar filtros</button>
          </div>
        )}

        {datos && datos.total > 0 && (
          <div style={{ opacity: tabla.cargando ? 0.55 : 1 }}>
            {/* Computador: tabla */}
            <div className="table-responsive d-none d-md-block">
              <table className="table tabla">
                <thead>
                  <tr>
                    <th>SKU</th><th>Producto</th><th className="d-none d-xl-table-cell">Categoría</th>
                    <th className="text-end">Stock</th><th className="text-end">Mínimo</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.datos.map((p) => (
                    <tr key={p._id} className={resaltado === p._id ? "resaltada" : ""}>
                      <td className="texto-secundario text-nowrap codigo">{p.sku}</td>
                      <td className="fw-semibold">{p.nombre}</td>
                      <td className="d-none d-xl-table-cell">{p.categoria.nombre}</td>
                      <td className={`text-end tabular ${p.estadoStock !== "normal" ? "stock-bajo" : ""}`}>{numero(p.inventario.stockActual)}</td>
                      <td className="text-end tabular">{numero(p.stockMinimo)}</td>
                      <td><EtiquetaEstado valor={p.estadoStock} /></td>
                      <td>{acciones(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Celular: la tabla se convierte en tarjetas */}
            <div className="d-md-none p-3">
              {datos.datos.map((p) => (
                <div key={p._id} className="tarjeta-movil" style={resaltado === p._id ? { background: "#edf8f1" } : undefined}>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <span className="texto-secundario small codigo">{p.sku}</span>
                    <EtiquetaEstado valor={p.estadoStock} />
                  </div>
                  <div className="fw-bold my-1" style={{ fontSize: "1rem" }}>{p.nombre}</div>
                  <div className="mb-2">
                    Stock <span className={p.estadoStock !== "normal" ? "stock-bajo" : "fw-semibold"}>{numero(p.inventario.stockActual)}</span> · Mínimo {p.stockMinimo}
                    {" · "}<Link to={`/panel/historial?producto=${p._id}`}>Historial</Link>
                  </div>
                  {acciones(p, true)}
                </div>
              ))}
            </div>

            <div className="pie-tabla">
              <span>
                Mostrando {(datos.pagina - 1) * datos.porPagina + 1}–{Math.min(datos.pagina * datos.porPagina, datos.total)} de {datos.total} productos
                {!estado && " · primero los que requieren atención"}
              </span>
              <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} alCambiar={setPagina} />
            </div>
          </div>
        )}
        {tabla.cargando && !datos && <div className="p-3"><div className="esqueleto" style={{ height: 320 }} /></div>}
      </section>

      {movimiento && (
        <ModalMovimiento producto={movimiento.producto} tipo={movimiento.tipo} alCerrar={() => setMovimiento(null)} alRegistrar={alRegistrar} />
      )}
      {nuevoProducto && (
        <FormProducto
          alCerrar={() => setNuevoProducto(false)}
          alGuardar={(p) => {
            setNuevoProducto(false);
            avisar({ tipo: "exito", titulo: "Producto creado", mensaje: `${p.nombre} (${p.sku}) quedó con stock 0. Registra una entrada para sumar unidades.` });
            tabla.recargar();
            resumen.recargar();
          }}
        />
      )}
    </>
  );
}
