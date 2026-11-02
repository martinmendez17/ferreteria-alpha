import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../api/cliente";
import type { Categoria, Paginado, ProductoAdmin } from "../../api/tipos";
import { FormProducto } from "../../componentes/FormProducto";
import { ImagenProducto } from "../../componentes/ImagenProducto";
import { ErrorCarga, EtiquetaEstado, Paginacion } from "../../componentes/Ui";
import { Confirmar } from "../../componentes/Ventana";
import { useAvisos } from "../../contexto/Avisos";
import { useTitulo } from "../../disenos/LayoutInterno";
import { dinero, numero } from "../../utils/formato";
import { usarDatos, usarRetraso } from "../../utils/usarDatos";

/** RF09: mantenedor de productos (crear, editar, dar de baja y reactivar). Solo Administrador. */
export function Productos() {
  useTitulo("Productos");
  const { avisar } = useAvisos();
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("activo");
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<ProductoAdmin | "nuevo" | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState<ProductoAdmin | null>(null);
  const busqueda = usarRetraso(texto.trim());

  const categorias = usarDatos((signal) => api<Categoria[]>("/categorias", { signal }), []);
  const lista = usarDatos(
    (signal) => api<Paginado<ProductoAdmin>>("/productos/admin/lista", { signal, consulta: { q: busqueda, categoria, estado, pagina, porPagina: 10 } }),
    [busqueda, categoria, estado, pagina],
  );
  const d = lista.datos;

  return (
    <>
      <section className="superficie">
        <div className="barra-herramientas">
          <input className="form-control flex-grow-1" style={{ minWidth: "14rem", flexBasis: "18rem" }} type="search" placeholder="Buscar por nombre, SKU o marca…"
            aria-label="Buscar producto" value={texto} onChange={(e) => { setTexto(e.target.value); setPagina(1); }} />
          <select className="form-select w-auto" aria-label="Categoría" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPagina(1); }}>
            <option value="">Categoría: todas</option>
            {categorias.datos?.map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
          </select>
          <select className="form-select w-auto" aria-label="Estado" value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1); }}>
            <option value="activo">Activos</option>
            <option value="descontinuado">Descontinuados</option>
            <option value="">Todos</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={() => setEditando("nuevo")}>+ Nuevo producto</button>
        </div>

        {lista.error && <ErrorCarga mensaje={lista.error} alReintentar={lista.recargar} />}
        {lista.cargando && !d && <div className="p-3"><div className="esqueleto" style={{ height: 300 }} /></div>}
        {d && d.total === 0 && (
          <div className="vacio">
            <h2 className="subtitulo mb-2">No hay productos con estos filtros</h2>
            <p className="texto-secundario mb-0">Cambia la búsqueda o crea un producto nuevo.</p>
          </div>
        )}
        {d && d.total > 0 && (
          <div style={{ opacity: lista.cargando ? 0.55 : 1 }}>
            <div className="table-responsive">
              <table className="table tabla">
                <thead>
                  <tr>
                    <th>Producto</th><th className="d-none d-lg-table-cell">Categoría</th><th className="d-none d-xl-table-cell">Proveedor</th>
                    <th className="text-end">Precio</th><th className="text-end">Stock</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {d.datos.map((p) => (
                    <tr key={p._id} style={p.estado === "descontinuado" ? { opacity: 0.7 } : undefined}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="miniatura"><ImagenProducto url={p.imagenUrl} alt="" /></div>
                          <div>
                            <div className="fw-semibold">{p.nombre}</div>
                            <div className="texto-secundario small"><span className="codigo">{p.sku}</span>{p.marca && ` · ${p.marca}`}</div>
                          </div>
                        </div>
                      </td>
                      <td className="d-none d-lg-table-cell">{p.categoria.nombre}</td>
                      <td className="d-none d-xl-table-cell">{p.proveedor?.razonSocial ?? <span className="texto-secundario">Sin proveedor</span>}</td>
                      <td className="text-end tabular">{dinero(p.precioVenta)}</td>
                      <td className="text-end tabular">
                        {numero(p.inventario.stockActual)}
                        <div><EtiquetaEstado valor={p.estadoStock} /></div>
                      </td>
                      <td>
                        {p.estado === "activo" ? <span className="estado estado-ok">Activo</span> : <span className="estado estado-neutro">Descontinuado</span>}
                      </td>
                      <td>
                        <div className="d-flex gap-2 flex-wrap">
                          <button type="button" className="btn btn-secundario btn-sm" onClick={() => setEditando(p)}>Editar</button>
                          <button type="button" className={`btn btn-sm ${p.estado === "activo" ? "btn-peligro" : "btn-secundario"}`} onClick={() => setCambiandoEstado(p)}>
                            {p.estado === "activo" ? "Dar de baja" : "Reactivar"}
                          </button>
                          <Link to={`/panel/historial?producto=${p._id}`} className="btn btn-enlace btn-sm">Historial</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pie-tabla">
              <span>{d.total} {d.total === 1 ? "producto" : "productos"}</span>
              <Paginacion pagina={d.pagina} totalPaginas={d.totalPaginas} alCambiar={setPagina} />
            </div>
          </div>
        )}
      </section>

      {editando && (
        <FormProducto
          producto={editando === "nuevo" ? undefined : editando}
          alCerrar={() => setEditando(null)}
          alGuardar={(p) => {
            avisar({ tipo: "exito", titulo: editando === "nuevo" ? "Producto creado" : "Cambios guardados", mensaje: `${p.nombre} (${p.sku})` });
            setEditando(null);
            lista.recargar();
          }}
        />
      )}

      {cambiandoEstado && (
        <Confirmar
          titulo={cambiandoEstado.estado === "activo" ? "Dar de baja el producto" : "Reactivar el producto"}
          mensaje={
            cambiandoEstado.estado === "activo" ? (
              <>
                <p><strong>{cambiandoEstado.nombre}</strong> dejará de aparecer en el catálogo y en el inventario.</p>
                <p className="texto-secundario mb-0">No se borra: su historial de movimientos se conserva y puedes reactivarlo cuando quieras.</p>
              </>
            ) : (
              <p className="mb-0"><strong>{cambiandoEstado.nombre}</strong> volverá a aparecer en el catálogo y en el inventario.</p>
            )
          }
          textoBoton={cambiandoEstado.estado === "activo" ? "Dar de baja" : "Reactivar"}
          peligro={cambiandoEstado.estado === "activo"}
          alCerrar={() => setCambiandoEstado(null)}
          alConfirmar={async () => {
            const nuevo = cambiandoEstado.estado === "activo" ? "descontinuado" : "activo";
            await api(`/productos/${cambiandoEstado._id}/estado`, { metodo: "PATCH", cuerpo: { estado: nuevo } });
            avisar({ tipo: "exito", titulo: nuevo === "activo" ? "Producto reactivado" : "Producto dado de baja", mensaje: cambiandoEstado.nombre });
            lista.recargar();
          }}
        />
      )}
    </>
  );
}
