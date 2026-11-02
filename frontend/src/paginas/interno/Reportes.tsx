import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { api, mensajeDeError } from "../../api/cliente";
import type { Categoria, ColumnaReporte, InfoReporte, ResultadoReporte } from "../../api/tipos";
import { Aviso, Cargando, ErrorCarga } from "../../componentes/Ui";
import { useTitulo } from "../../disenos/LayoutInterno";
import { dinero, diaIso, fechaHora, numero } from "../../utils/formato";
import { usarDatos } from "../../utils/usarDatos";

function formatear(valor: unknown, tipo: ColumnaReporte["tipo"]) {
  if (valor === null || valor === undefined || valor === "") return "—";
  switch (tipo) {
    case "dinero": return dinero(Number(valor));
    case "numero": return numero(Number(valor));
    case "fecha": return fechaHora(String(valor));
    case "dia": return diaIso(String(valor));
    default: return String(valor);
  }
}

/** Gráfico de barras horizontales simple (sin librerías). */
function GraficoBarras({ filas, etiqueta, valor, titulo, tipo }: { filas: Record<string, unknown>[]; etiqueta: string; valor: string; titulo: string; tipo: ColumnaReporte["tipo"] }) {
  const datos = filas.slice(0, 15).map((f) => ({ nombre: formatear(f[etiqueta], etiqueta === "dia" ? "dia" : "texto"), n: Number(f[valor]) || 0 }));
  const maximo = Math.max(...datos.map((d) => d.n), 1);
  return (
    <figure className="grafico-barras mb-4" aria-label={titulo}>
      <figcaption className="etiqueta mb-3">{titulo}</figcaption>
      {datos.map((d, i) => (
        <div className="fila" key={i}>
          <span className="nombre-barra" title={d.nombre}>{d.nombre}</span>
          <div className="pista">
            <div className="barra" style={{ width: `${(d.n / maximo) * 85}%` }} />
            <span className="valor-barra tabular">{formatear(d.n, tipo)}</span>
          </div>
        </div>
      ))}
    </figure>
  );
}

function Codigo({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="position-relative">
      <button type="button" className="btn btn-sm btn-secundario position-absolute" style={{ top: 8, right: 8 }}
        onClick={() => navigator.clipboard?.writeText(texto).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); })}>
        {copiado ? "Copiado" : "Copiar"}
      </button>
      <pre className="bloque-codigo"><code>{texto}</code></pre>
    </div>
  );
}

/**
 * Reportes: consultas a MongoDB con $lookup (JOIN), $group (GROUP BY) y
 * operadores. Cada reporte muestra el resultado, la consulta de MongoDB que
 * se ejecutó y la consulta SQL equivalente del modelo relacional.
 */
export function Reportes() {
  useTitulo("Reportes");
  const [params, setParams] = useSearchParams();
  const lista = usarDatos((signal) => api<InfoReporte[]>("/reportes", { signal }), []);
  const categorias = usarDatos((signal) => api<Categoria[]>("/categorias", { signal }), []);

  const idActual = params.get("r") ?? lista.datos?.[0]?.id ?? "";
  const reporte = lista.datos?.find((r) => r.id === idActual);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ResultadoReporte | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<"resultado" | "mongo" | "sql">("resultado");

  async function ejecutar(r: InfoReporte, v: Record<string, string>) {
    setCargando(true);
    setError(null);
    try {
      setResultado(await api<ResultadoReporte>(`/reportes/${r.id}`, { consulta: v }));
    } catch (e) {
      setError(mensajeDeError(e));
      setResultado(null);
    } finally {
      setCargando(false);
    }
  }

  // Al elegir un reporte se cargan sus valores por defecto y se ejecuta
  useEffect(() => {
    if (!reporte) return;
    const iniciales = Object.fromEntries(reporte.parametros.map((p) => [p.nombre, String(p.porDefecto)]));
    setValores(iniciales);
    setPestana("resultado");
    void ejecutar(reporte, iniciales);
  }, [reporte]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (reporte) void ejecutar(reporte, valores);
  }

  if (lista.error) return <ErrorCarga mensaje={lista.error} alReintentar={lista.recargar} />;
  if (!lista.datos) return <Cargando />;

  return (
    <div className="row g-4">
      <aside className="col-lg-4 col-xl-3">
        <div className="d-lg-none mb-2">
          <label htmlFor="sel-reporte" className="form-label">Reporte</label>
          <select id="sel-reporte" className="form-select" value={idActual} onChange={(e) => setParams({ r: e.target.value })}>
            {lista.datos.map((r) => <option key={r.id} value={r.id}>{r.titulo}</option>)}
          </select>
        </div>
        <nav className="lista-reportes d-none d-lg-block" aria-label="Reportes disponibles">
          {lista.datos.map((r) => (
            <button key={r.id} type="button" className={r.id === idActual ? "activo" : ""} onClick={() => setParams({ r: r.id })} aria-current={r.id === idActual}>
              <div className="fw-semibold mb-1">{r.titulo}</div>
              <div>{r.conceptos.map((c) => <span key={c} className="chip-concepto">{c.split(" (")[0]}</span>)}</div>
            </button>
          ))}
        </nav>
      </aside>

      {reporte && (
        <section className="col-lg-8 col-xl-9">
          <div className="superficie p-3 p-md-4">
            <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
              <h2 className="subtitulo">{reporte.titulo}</h2>
              <span className="texto-secundario small">Colección <code>{reporte.coleccion}</code> · {reporte.requerimiento}</span>
            </div>
            <p className="texto-secundario">{reporte.descripcion}</p>
            <div className="mb-3">{reporte.conceptos.map((c) => <span key={c} className="chip-concepto">{c}</span>)}</div>

            {reporte.parametros.length > 0 && (
              <form className="row g-3 align-items-end mb-3" onSubmit={enviar} noValidate>
                {reporte.parametros.map((p) => (
                  <div key={p.nombre} className={p.tipo === "categorias" ? "col-12" : "col-6 col-md-3"}>
                    <label className="form-label" htmlFor={`rp-${p.nombre}`}>{p.etiqueta}</label>
                    {p.tipo === "opcion" ? (
                      <select id={`rp-${p.nombre}`} className="form-select" value={valores[p.nombre] ?? ""} onChange={(e) => setValores({ ...valores, [p.nombre]: e.target.value })}>
                        {p.opciones?.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
                      </select>
                    ) : p.tipo === "categorias" ? (
                      <div className="d-flex flex-wrap gap-3" id={`rp-${p.nombre}`}>
                        {categorias.datos?.map((c) => {
                          const elegidas = (valores[p.nombre] ?? "").split(",").filter(Boolean);
                          const marcada = elegidas.includes(c.nombre);
                          return (
                            <div className="form-check" key={c._id}>
                              <input className="form-check-input" type="checkbox" id={`rc-${c._id}`} checked={marcada}
                                onChange={() => setValores({ ...valores, [p.nombre]: (marcada ? elegidas.filter((x) => x !== c.nombre) : [...elegidas, c.nombre]).join(",") })} />
                              <label className="form-check-label" htmlFor={`rc-${c._id}`}>{c.nombre}</label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <input id={`rp-${p.nombre}`} className="form-control" type={p.tipo === "fecha" ? "date" : "text"} inputMode={p.tipo === "numero" ? "numeric" : undefined}
                        value={valores[p.nombre] ?? ""} onChange={(e) => setValores({ ...valores, [p.nombre]: p.tipo === "numero" ? e.target.value.replace(/\D/g, "") : e.target.value })} />
                    )}
                  </div>
                ))}
                <div className="col-6 col-md-3 d-grid">
                  <button type="submit" className="btn btn-primary" disabled={cargando}>{cargando ? "Ejecutando…" : "Ejecutar consulta"}</button>
                </div>
              </form>
            )}

            <div className="pestanas" role="tablist">
              {([["resultado", "Resultado"], ["mongo", "Consulta MongoDB"], ["sql", "Equivalente SQL"]] as const).map(([id, texto]) => (
                <button key={id} type="button" role="tab" aria-selected={pestana === id} className={pestana === id ? "activa" : ""} onClick={() => setPestana(id)}>{texto}</button>
              ))}
            </div>

            {error && <Aviso tipo="error" titulo="No se pudo ejecutar la consulta">{error}</Aviso>}
            {cargando && !resultado && <Cargando texto="Ejecutando consulta…" />}

            {resultado && !error && (
              <div style={{ opacity: cargando ? 0.55 : 1 }}>
                {pestana === "resultado" && (
                  <>
                    <p className="texto-secundario small">
                      {resultado.filas.length} {resultado.filas.length === 1 ? "fila" : "filas"} · la base respondió en {resultado.milisegundos} ms
                    </p>
                    {resultado.filas.length === 0 ? (
                      <Aviso tipo="info">La consulta no devolvió resultados con estos parámetros.</Aviso>
                    ) : (
                      <>
                        {resultado.grafico && (
                          <GraficoBarras filas={resultado.filas} etiqueta={resultado.grafico.etiqueta} valor={resultado.grafico.valor} titulo={resultado.grafico.titulo}
                            tipo={resultado.columnas.find((c) => c.clave === resultado.grafico!.valor)?.tipo ?? "numero"} />
                        )}
                        <div className="table-responsive border rounded-3">
                          <table className="table tabla">
                            <thead>
                              <tr>{resultado.columnas.map((c) => <th key={c.clave} className={["numero", "dinero"].includes(c.tipo) ? "text-end" : ""}>{c.etiqueta}</th>)}</tr>
                            </thead>
                            <tbody>
                              {resultado.filas.map((f, i) => (
                                <tr key={i}>
                                  {resultado.columnas.map((c) => (
                                    <td key={c.clave} className={["numero", "dinero"].includes(c.tipo) ? "text-end tabular" : ""}>{formatear(f[c.clave], c.tipo)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                )}
                {pestana === "mongo" && (
                  <>
                    <p className="texto-secundario small">Esta es exactamente la agregación que ejecutó el servidor. Se puede pegar en mongosh o en MongoDB Compass.</p>
                    <Codigo texto={resultado.consultaMongo} />
                  </>
                )}
                {pestana === "sql" && (
                  <>
                    <p className="texto-secundario small">La misma consulta escrita para el modelo relacional de la Entrega 1 (PostgreSQL), para comparar.</p>
                    <Codigo texto={resultado.consultaSql} />
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
