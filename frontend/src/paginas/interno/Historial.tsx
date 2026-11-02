import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../api/cliente";
import type { FilaInventario, Historial as DatosHistorial, Paginado } from "../../api/tipos";
import { Aviso, ErrorCarga, EtiquetaEstado, Kpi, Paginacion } from "../../componentes/Ui";
import { useTitulo } from "../../disenos/LayoutInterno";
import { diaIso, fechaHora, hoyIso, numero } from "../../utils/formato";
import { usarDatos } from "../../utils/usarDatos";

/** RF13: historial de movimientos (kardex) por producto, tipo y fechas. */
export function Historial() {
  useTitulo("Historial de movimientos");
  const [params, setParams] = useSearchParams();
  const filtros = {
    producto: params.get("producto") ?? "",
    tipo: params.get("tipo") ?? "",
    desde: params.get("desde") ?? hoyIso(30),
    hasta: params.get("hasta") ?? hoyIso(),
    pagina: Number(params.get("pagina") ?? 1) || 1,
  };
  const [borrador, setBorrador] = useState(filtros);
  const [errorFechas, setErrorFechas] = useState<string | null>(null);
  // Si la URL cambia (por ejemplo, al hacer clic en un producto), el formulario se actualiza
  useEffect(() => {
    setBorrador(filtros);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lista de productos para el selector (incluye todos los activos)
  const productos = usarDatos((signal) => api<Paginado<FilaInventario>>("/inventario", { signal, consulta: { porPagina: 100 } }), []);
  const historial = usarDatos(
    (signal) => api<DatosHistorial>("/movimientos", { signal, consulta: { ...filtros, porPagina: 10 } }),
    [filtros.producto, filtros.tipo, filtros.desde, filtros.hasta, filtros.pagina],
  );

  function filtrar(e: FormEvent) {
    e.preventDefault();
    if (borrador.desde && borrador.hasta && borrador.desde > borrador.hasta) {
      setErrorFechas("La fecha “Desde” no puede ser posterior a “Hasta”.");
      return;
    }
    setErrorFechas(null);
    const nuevos: Record<string, string> = {};
    for (const k of ["producto", "tipo", "desde", "hasta"] as const) if (borrador[k]) nuevos[k] = borrador[k];
    setParams(nuevos);
  }

  const d = historial.datos;
  const producto = d?.resumen.producto;
  const periodo = `${diaIso(filtros.desde)} al ${diaIso(filtros.hasta)}`;

  return (
    <>
      <form className="superficie p-3 mb-3" onSubmit={filtrar} noValidate>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-lg-5">
            <label className="form-label" htmlFor="h-producto">Producto</label>
            <select id="h-producto" className="form-select" value={borrador.producto} onChange={(e) => setBorrador({ ...borrador, producto: e.target.value })}>
              <option value="">Todos los productos</option>
              {productos.datos?.datos
                .slice()
                .sort((a, b) => a.sku.localeCompare(b.sku))
                .map((p) => <option key={p._id} value={p._id}>{p.sku} · {p.nombre}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label" htmlFor="h-tipo">Tipo</label>
            <select id="h-tipo" className="form-select" value={borrador.tipo} onChange={(e) => setBorrador({ ...borrador, tipo: e.target.value })}>
              <option value="">Entradas y salidas</option>
              <option value="entrada">Solo entradas</option>
              <option value="salida">Solo salidas</option>
            </select>
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label" htmlFor="h-desde">Desde</label>
            <input id="h-desde" type="date" className={`form-control ${errorFechas ? "is-invalid" : ""}`} value={borrador.desde} max={hoyIso()}
              onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} />
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label" htmlFor="h-hasta">Hasta</label>
            <input id="h-hasta" type="date" className="form-control" value={borrador.hasta} max={hoyIso()}
              onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })} />
          </div>
          <div className="col-6 col-md-3 col-lg-1 d-grid">
            <button type="submit" className="btn btn-primary">Filtrar</button>
          </div>
        </div>
        {errorFechas && <div className="invalid-feedback d-block mt-2">{errorFechas}</div>}
      </form>

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4">
          {producto ? (
            <Kpi etiqueta={`Stock actual · ${producto.sku}`} valor={<span className={producto.estadoStock !== "normal" ? "text-warning-emphasis" : ""}>{numero(producto.stockActual)}</span>}>
              <EtiquetaEstado valor={producto.estadoStock} />
            </Kpi>
          ) : (
            <Kpi etiqueta="Movimientos en el período" valor={d ? numero(d.total) : "—"} />
          )}
        </div>
        <div className="col-6 col-md-4"><Kpi etiqueta="Entradas en el período" valor={d ? `+${numero(d.resumen.entradas)}` : "—"} /></div>
        <div className="col-6 col-md-4"><Kpi etiqueta="Salidas en el período" valor={d ? `−${numero(d.resumen.salidas)}` : "—"} /></div>
      </div>

      <Aviso tipo="info" className="mb-3">
        Los movimientos no se pueden editar ni borrar. Para corregir un error se registra un <strong>ajuste de conteo</strong>.
      </Aviso>

      <section className="superficie">
        {historial.error && <ErrorCarga mensaje={historial.error} alReintentar={historial.recargar} />}
        {historial.cargando && !d && <div className="p-3"><div className="esqueleto" style={{ height: 280 }} /></div>}
        {d && d.total === 0 && (
          <div className="vacio">
            <h2 className="subtitulo mb-2">No hay movimientos en este período</h2>
            <p className="texto-secundario mb-0">Del {periodo}. Prueba con otras fechas o con otro producto.</p>
          </div>
        )}
        {d && d.total > 0 && (
          <div style={{ opacity: historial.cargando ? 0.55 : 1 }}>
            <div className="table-responsive">
              <table className="table tabla">
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    {!producto && <th>Producto</th>}
                    <th>Tipo</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Stock después</th>
                    <th>Motivo</th>
                    <th>Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {d.datos.map((m) => (
                    <tr key={m._id}>
                      <td className="text-nowrap tabular">{fechaHora(m.fechaHora)}</td>
                      {!producto && (
                        <td>
                          <button type="button" className="btn-enlace text-start" onClick={() => setParams({ ...Object.fromEntries(params), producto: m.producto._id, pagina: "1" })}>
                            {m.producto.nombre}
                          </button>
                          <div className="texto-secundario small codigo">{m.producto.sku}</div>
                        </td>
                      )}
                      <td>
                        <span className={`estado ${m.tipoMovimiento === "entrada" ? "estado-ok" : "estado-info"}`}>
                          {m.tipoMovimiento === "entrada" ? "Entrada" : "Salida"}
                        </span>
                      </td>
                      <td className="text-end tabular">{m.tipoMovimiento === "entrada" ? "+" : "−"}{numero(m.cantidad)}</td>
                      <td className="text-end tabular fw-bold">{numero(m.stockResultante)}</td>
                      <td>{m.motivo}</td>
                      <td className="text-nowrap">{m.usuario.nombreCompleto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pie-tabla">
              <span>{d.total} {d.total === 1 ? "movimiento" : "movimientos"}{producto ? " de este producto" : ""} · del más reciente al más antiguo</span>
              <Paginacion pagina={d.pagina} totalPaginas={d.totalPaginas} alCambiar={(p) => setParams({ ...Object.fromEntries(params), pagina: String(p) })} />
            </div>
          </div>
        )}
      </section>
    </>
  );
}
