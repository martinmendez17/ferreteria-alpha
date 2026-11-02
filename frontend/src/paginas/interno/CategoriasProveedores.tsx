import { useState, type FormEvent } from "react";
import { api, ErrorApi, mensajeDeError } from "../../api/cliente";
import type { Categoria, Proveedor } from "../../api/tipos";
import { Aviso, ErrorCarga } from "../../componentes/Ui";
import { Confirmar, Ventana } from "../../componentes/Ventana";
import { useAvisos } from "../../contexto/Avisos";
import { useTitulo } from "../../disenos/LayoutInterno";
import { usarDatos } from "../../utils/usarDatos";

interface CampoDef {
  nombre: string;
  etiqueta: string;
  obligatorio?: boolean;
  max: number;
  tipo?: string;
  ayuda?: string;
}

/** Formulario genérico (categoría o proveedor) en una ventana. */
function FormSimple({
  titulo, campos, inicial, alCerrar, alEnviar,
}: {
  titulo: string;
  campos: CampoDef[];
  inicial: Record<string, string>;
  alCerrar: () => void;
  alEnviar: (valores: Record<string, string | null>) => Promise<void>;
}) {
  const [valores, setValores] = useState(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const nuevos: Record<string, string> = {};
    for (const c of campos) if (c.obligatorio && !valores[c.nombre]?.trim()) nuevos[c.nombre] = `${c.etiqueta} es obligatorio`;
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setEnviando(true);
    setErrorGeneral(null);
    try {
      await alEnviar(Object.fromEntries(campos.map((c) => [c.nombre, valores[c.nombre]?.trim() || null])));
    } catch (err) {
      const campo = err instanceof ErrorApi ? err.campo : undefined;
      if (campo && campos.some((c) => c.nombre === campo)) setErrores({ [campo]: mensajeDeError(err) });
      else if (err instanceof ErrorApi && err.codigo === "DUPLICADO") setErrores({ [campos[0]!.nombre]: err.message });
      else setErrorGeneral(mensajeDeError(err));
      setEnviando(false);
    }
  }

  return (
    <Ventana
      titulo={titulo}
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="btn btn-secundario" onClick={alCerrar}>Cancelar</button>
          <button type="submit" form="form-simple" className="btn btn-primary" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
        </>
      }
    >
      {errorGeneral && <Aviso tipo="error" className="mb-3">{errorGeneral}</Aviso>}
      <form id="form-simple" onSubmit={enviar} noValidate>
        {campos.map((c) => (
          <div className="mb-3" key={c.nombre}>
            <label className="form-label" htmlFor={`f-${c.nombre}`}>{c.etiqueta}{!c.obligatorio && <span className="texto-secundario fw-normal"> (opcional)</span>}</label>
            <input id={`f-${c.nombre}`} type={c.tipo ?? "text"} maxLength={c.max} className={`form-control ${errores[c.nombre] ? "is-invalid" : ""}`}
              value={valores[c.nombre] ?? ""} onChange={(e) => setValores({ ...valores, [c.nombre]: e.target.value })} />
            {errores[c.nombre] ? <div className="invalid-feedback d-block">{errores[c.nombre]}</div> : c.ayuda && <div className="form-text">{c.ayuda}</div>}
          </div>
        ))}
      </form>
    </Ventana>
  );
}

const CAMPOS_CATEGORIA: CampoDef[] = [
  { nombre: "nombre", etiqueta: "Nombre", obligatorio: true, max: 80, ayuda: "Si lo cambias, se actualiza en todos sus productos" },
  { nombre: "descripcion", etiqueta: "Descripción", max: 255 },
];
const CAMPOS_PROVEEDOR: CampoDef[] = [
  { nombre: "razonSocial", etiqueta: "Razón social", obligatorio: true, max: 120 },
  { nombre: "telefono", etiqueta: "Teléfono", max: 20, tipo: "tel", ayuda: "Ej.: +56 2 2345 6701" },
  { nombre: "email", etiqueta: "Correo", max: 150, tipo: "email" },
];

/** RF15: mantenedor de categorías y proveedores (solo Administrador). */
export function CategoriasProveedores() {
  useTitulo("Categorías y proveedores");
  const { avisar } = useAvisos();
  const categorias = usarDatos((signal) => api<Categoria[]>("/categorias", { signal }), []);
  const proveedores = usarDatos((signal) => api<Proveedor[]>("/proveedores", { signal }), []);

  const [formCat, setFormCat] = useState<Categoria | "nueva" | null>(null);
  const [formProv, setFormProv] = useState<Proveedor | "nuevo" | null>(null);
  const [borrar, setBorrar] = useState<{ tipo: "categoria"; item: Categoria } | { tipo: "proveedor"; item: Proveedor } | null>(null);

  return (
    <div className="row g-4">
      <section className="col-xl-6">
        <div className="superficie h-100">
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
            <h2 className="subtitulo">Categorías</h2>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormCat("nueva")}>+ Nueva categoría</button>
          </div>
          {categorias.error && <ErrorCarga mensaje={categorias.error} alReintentar={categorias.recargar} />}
          {categorias.datos && (
            <div className="table-responsive">
              <table className="table tabla">
                <thead><tr><th>Nombre</th><th className="text-end">Productos</th><th>Acciones</th></tr></thead>
                <tbody>
                  {categorias.datos.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <div className="fw-semibold">{c.nombre}</div>
                        {c.descripcion && <div className="texto-secundario small">{c.descripcion}</div>}
                      </td>
                      <td className="text-end tabular">
                        {c.productosActivos}
                        {c.productosTotal > c.productosActivos && <div className="texto-secundario small">+{c.productosTotal - c.productosActivos} de baja</div>}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-secundario btn-sm" onClick={() => setFormCat(c)}>Editar</button>
                          <button type="button" className="btn btn-peligro btn-sm" onClick={() => setBorrar({ tipo: "categoria", item: c })}
                            title={c.productosTotal > 0 ? "Tiene productos: no se puede eliminar" : undefined}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="col-xl-6">
        <div className="superficie h-100">
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
            <h2 className="subtitulo">Proveedores</h2>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormProv("nuevo")}>+ Nuevo proveedor</button>
          </div>
          {proveedores.error && <ErrorCarga mensaje={proveedores.error} alReintentar={proveedores.recargar} />}
          {proveedores.datos && (
            <div className="table-responsive">
              <table className="table tabla">
                <thead><tr><th>Proveedor</th><th className="text-end">Productos</th><th>Acciones</th></tr></thead>
                <tbody>
                  {proveedores.datos.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div className="fw-semibold">{p.razonSocial}</div>
                        <div className="texto-secundario small">
                          {p.telefono && <a href={`tel:${p.telefono.replace(/\s/g, "")}`} className="text-reset">{p.telefono}</a>}
                          {p.telefono && p.email && " · "}
                          {p.email && <a href={`mailto:${p.email}`} className="text-reset">{p.email}</a>}
                        </div>
                      </td>
                      <td className="text-end tabular">{p.productosTotal}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-secundario btn-sm" onClick={() => setFormProv(p)}>Editar</button>
                          <button type="button" className="btn btn-peligro btn-sm" onClick={() => setBorrar({ tipo: "proveedor", item: p })}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {formCat && (
        <FormSimple
          titulo={formCat === "nueva" ? "Nueva categoría" : "Editar categoría"}
          campos={CAMPOS_CATEGORIA}
          inicial={formCat === "nueva" ? {} : { nombre: formCat.nombre, descripcion: formCat.descripcion ?? "" }}
          alCerrar={() => setFormCat(null)}
          alEnviar={async (v) => {
            if (formCat === "nueva") await api("/categorias", { metodo: "POST", cuerpo: v });
            else await api(`/categorias/${formCat._id}`, { metodo: "PUT", cuerpo: v });
            avisar({ tipo: "exito", titulo: formCat === "nueva" ? "Categoría creada" : "Categoría actualizada", mensaje: v["nombre"] ?? "" });
            setFormCat(null);
            categorias.recargar();
          }}
        />
      )}

      {formProv && (
        <FormSimple
          titulo={formProv === "nuevo" ? "Nuevo proveedor" : "Editar proveedor"}
          campos={CAMPOS_PROVEEDOR}
          inicial={formProv === "nuevo" ? {} : { razonSocial: formProv.razonSocial, telefono: formProv.telefono ?? "", email: formProv.email ?? "" }}
          alCerrar={() => setFormProv(null)}
          alEnviar={async (v) => {
            if (formProv === "nuevo") await api("/proveedores", { metodo: "POST", cuerpo: v });
            else await api(`/proveedores/${formProv._id}`, { metodo: "PUT", cuerpo: v });
            avisar({ tipo: "exito", titulo: formProv === "nuevo" ? "Proveedor creado" : "Proveedor actualizado", mensaje: v["razonSocial"] ?? "" });
            setFormProv(null);
            proveedores.recargar();
          }}
        />
      )}

      {borrar && (
        <Confirmar
          titulo={borrar.tipo === "categoria" ? "Eliminar categoría" : "Eliminar proveedor"}
          mensaje={
            <p className="mb-0">
              ¿Eliminar <strong>{borrar.tipo === "categoria" ? borrar.item.nombre : borrar.item.razonSocial}</strong>? Esta acción no se puede deshacer.
              Solo se puede eliminar si no tiene productos asociados.
            </p>
          }
          textoBoton="Eliminar"
          peligro
          alCerrar={() => setBorrar(null)}
          alConfirmar={async () => {
            if (borrar.tipo === "categoria") {
              await api(`/categorias/${borrar.item._id}`, { metodo: "DELETE" });
              categorias.recargar();
            } else {
              await api(`/proveedores/${borrar.item._id}`, { metodo: "DELETE" });
              proveedores.recargar();
            }
            avisar({ tipo: "exito", titulo: "Eliminado correctamente" });
          }}
        />
      )}
    </div>
  );
}
