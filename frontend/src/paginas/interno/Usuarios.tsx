import { useState, type FormEvent } from "react";
import { api, ErrorApi, mensajeDeError } from "../../api/cliente";
import type { Rol, UsuarioAdmin } from "../../api/tipos";
import { Aviso, ErrorCarga } from "../../componentes/Ui";
import { Confirmar, Ventana } from "../../componentes/Ventana";
import { useAvisos } from "../../contexto/Avisos";
import { useSesion } from "../../contexto/Sesion";
import { useTitulo } from "../../disenos/LayoutInterno";
import { fechaHora, iniciales } from "../../utils/formato";
import { usarDatos } from "../../utils/usarDatos";
import { problemasContrasena } from "../publico/Recuperar";

function FormUsuario({ usuario, alCerrar, alGuardar }: { usuario?: UsuarioAdmin; alCerrar: () => void; alGuardar: (u: UsuarioAdmin) => void }) {
  const [v, setV] = useState({ nombreCompleto: usuario?.nombreCompleto ?? "", email: usuario?.email ?? "", rol: usuario?.rol ?? ("Empleado" as Rol), password: "" });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!v.nombreCompleto.trim()) err["nombreCompleto"] = "El nombre es obligatorio";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) err["email"] = "Escribe un correo válido";
    if (!usuario || v.password) {
      const p = problemasContrasena(v.password);
      if (p) err["password"] = p;
    }
    setErrores(err);
    if (Object.keys(err).length) return;
    setEnviando(true);
    setErrorGeneral(null);
    const cuerpo = { nombreCompleto: v.nombreCompleto.trim(), email: v.email.trim(), rol: v.rol, ...(v.password && { password: v.password }) };
    try {
      alGuardar(usuario
        ? await api<UsuarioAdmin>(`/usuarios/${usuario._id}`, { metodo: "PUT", cuerpo })
        : await api<UsuarioAdmin>("/usuarios", { metodo: "POST", cuerpo }));
    } catch (e) {
      const campo = e instanceof ErrorApi ? e.campo ?? (e.codigo === "DUPLICADO" ? "email" : undefined) : undefined;
      if (campo && campo in v) setErrores({ [campo]: mensajeDeError(e) });
      else setErrorGeneral(mensajeDeError(e));
      setEnviando(false);
    }
  }

  const campo = (nombre: keyof typeof v, etiqueta: string, tipo = "text", ayuda?: string, autocompletar?: string) => (
    <div className="mb-3">
      <label className="form-label" htmlFor={`u-${nombre}`}>{etiqueta}</label>
      <input id={`u-${nombre}`} type={tipo} autoComplete={autocompletar} className={`form-control ${errores[nombre] ? "is-invalid" : ""}`}
        value={v[nombre]} onChange={(e) => setV({ ...v, [nombre]: e.target.value })} />
      {errores[nombre] ? <div className="invalid-feedback d-block">{errores[nombre]}</div> : ayuda && <div className="form-text">{ayuda}</div>}
    </div>
  );

  return (
    <Ventana
      titulo={usuario ? "Editar usuario" : "Nuevo usuario"}
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="btn btn-secundario" onClick={alCerrar}>Cancelar</button>
          <button type="submit" form="form-usuario" className="btn btn-primary" disabled={enviando}>{enviando ? "Guardando…" : usuario ? "Guardar cambios" : "Crear usuario"}</button>
        </>
      }
    >
      {errorGeneral && <Aviso tipo="error" className="mb-3">{errorGeneral}</Aviso>}
      <form id="form-usuario" onSubmit={enviar} noValidate>
        {campo("nombreCompleto", "Nombre completo")}
        {campo("email", "Correo electrónico", "email", "Con este correo inicia sesión y recupera su contraseña", "off")}
        <div className="mb-3">
          <label className="form-label" htmlFor="u-rol">Rol</label>
          <select id="u-rol" className="form-select" value={v.rol} onChange={(e) => setV({ ...v, rol: e.target.value as Rol })}>
            <option value="Empleado">Empleado: registra entradas y salidas</option>
            <option value="Administrador">Administrador: además gestiona productos y usuarios</option>
          </select>
        </div>
        {campo("password", usuario ? "Nueva contraseña (opcional)" : "Contraseña inicial", "password",
          usuario ? "Déjala vacía para no cambiarla" : "Al menos 8 caracteres, con letras y números", "new-password")}
      </form>
    </Ventana>
  );
}

/** RF16: gestión de usuarios y roles (solo Administrador). Las cuentas se desactivan, no se borran. */
export function Usuarios() {
  useTitulo("Usuarios y roles");
  const { usuario: yo } = useSesion();
  const { avisar } = useAvisos();
  const lista = usarDatos((signal) => api<UsuarioAdmin[]>("/usuarios", { signal }), []);
  const [form, setForm] = useState<UsuarioAdmin | "nuevo" | null>(null);
  const [cambiar, setCambiar] = useState<UsuarioAdmin | null>(null);

  return (
    <>
      <section className="superficie">
        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center p-3 border-bottom">
          <p className="texto-secundario mb-0">Las cuentas no se borran: se desactivan, así sus movimientos siguen registrados a su nombre.</p>
          <button type="button" className="btn btn-primary" onClick={() => setForm("nuevo")}>+ Nuevo usuario</button>
        </div>
        {lista.error && <ErrorCarga mensaje={lista.error} alReintentar={lista.recargar} />}
        {lista.cargando && !lista.datos && <div className="p-3"><div className="esqueleto" style={{ height: 200 }} /></div>}
        {lista.datos && (
          <div className="table-responsive">
            <table className="table tabla">
              <thead>
                <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th className="d-none d-lg-table-cell">Último acceso</th><th className="text-end d-none d-md-table-cell">Movimientos</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {lista.datos.map((u) => {
                  const soyYo = u._id === yo?._id;
                  return (
                    <tr key={u._id} style={u.estado === "inactivo" ? { opacity: 0.65 } : undefined}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <span className="avatar">{iniciales(u.nombreCompleto)}</span>
                          <div>
                            <div className="fw-semibold">{u.nombreCompleto}{soyYo && <span className="texto-secundario fw-normal"> (tú)</span>}</div>
                            <div className="texto-secundario small">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{u.rol === "Administrador" ? <span className="estado estado-info estado-sin-punto">Administrador</span> : <span className="estado estado-neutro estado-sin-punto">Empleado</span>}</td>
                      <td>{u.estado === "activo" ? <span className="estado estado-ok">Activo</span> : <span className="estado estado-neutro">Inactivo</span>}</td>
                      <td className="d-none d-lg-table-cell text-nowrap">{u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : <span className="texto-secundario">Nunca</span>}</td>
                      <td className="text-end tabular d-none d-md-table-cell">{u.movimientos}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-secundario btn-sm" onClick={() => setForm(u)}>Editar</button>
                          {!soyYo && (
                            <button type="button" className={`btn btn-sm ${u.estado === "activo" ? "btn-peligro" : "btn-secundario"}`} onClick={() => setCambiar(u)}>
                              {u.estado === "activo" ? "Desactivar" : "Activar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form && (
        <FormUsuario
          usuario={form === "nuevo" ? undefined : form}
          alCerrar={() => setForm(null)}
          alGuardar={(u) => {
            avisar({ tipo: "exito", titulo: form === "nuevo" ? "Usuario creado" : "Cambios guardados", mensaje: `${u.nombreCompleto} · ${u.rol}` });
            setForm(null);
            lista.recargar();
          }}
        />
      )}
      {cambiar && (
        <Confirmar
          titulo={cambiar.estado === "activo" ? "Desactivar usuario" : "Activar usuario"}
          mensaje={cambiar.estado === "activo"
            ? <p className="mb-0"><strong>{cambiar.nombreCompleto}</strong> ya no podrá iniciar sesión. Si tiene una sesión abierta, se cerrará en su próxima acción.</p>
            : <p className="mb-0"><strong>{cambiar.nombreCompleto}</strong> podrá volver a iniciar sesión.</p>}
          textoBoton={cambiar.estado === "activo" ? "Desactivar" : "Activar"}
          peligro={cambiar.estado === "activo"}
          alCerrar={() => setCambiar(null)}
          alConfirmar={async () => {
            await api(`/usuarios/${cambiar._id}/estado`, { metodo: "PATCH", cuerpo: { estado: cambiar.estado === "activo" ? "inactivo" : "activo" } });
            avisar({ tipo: "exito", titulo: cambiar.estado === "activo" ? "Usuario desactivado" : "Usuario activado", mensaje: cambiar.nombreCompleto });
            lista.recargar();
          }}
        />
      )}
    </>
  );
}
