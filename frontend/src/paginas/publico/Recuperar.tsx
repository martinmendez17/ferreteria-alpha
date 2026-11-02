import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api, ErrorApi, mensajeDeError } from "../../api/cliente";
import { Aviso, Logo } from "../../componentes/Ui";

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Recuperar contraseña, paso 1: pedir el enlace por correo. */
export function Recuperar() {
  const [email, setEmail] = useState("");
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{ mensaje: string; enlaceDePrueba?: string } | null>(null);

  useEffect(() => {
    document.title = "Recuperar contraseña · Ferretería Alpha";
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!REGEX_EMAIL.test(email.trim())) {
      setErrorCampo("Escribe un correo válido, por ejemplo nombre@alpha.cl");
      return;
    }
    setErrorCampo(null);
    setError(null);
    setEnviando(true);
    try {
      setListo(await api("/auth/recuperar", { metodo: "POST", cuerpo: { email: email.trim() } }));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fondo-login">
      <main className="tarjeta-login">
        <div className="mb-4"><Logo oscuro /></div>
        <h1 className="titulo" style={{ fontSize: "1.6rem" }}>Recuperar contraseña</h1>

        {listo ? (
          <>
            <Aviso tipo="exito" titulo="Revisa tu correo" className="my-4">{listo.mensaje}</Aviso>
            {listo.enlaceDePrueba && (
              <Aviso tipo="info" titulo="Modo de prueba (sin servicio de correo)" className="mb-4">
                <a href={listo.enlaceDePrueba}>Abrir el enlace para cambiar la contraseña</a>
              </Aviso>
            )}
            <p className="texto-secundario">El enlace vence en 30 minutos y sirve una sola vez.</p>
            <Link to="/login" className="btn btn-primary w-100 btn-lg">Volver a iniciar sesión</Link>
          </>
        ) : (
          <>
            <p className="texto-secundario mt-1 mb-4" style={{ fontSize: "1rem" }}>
              Escribe el correo con que ingresas. Te enviaremos un enlace para elegir una contraseña nueva.
            </p>
            {error && <Aviso tipo="error" className="mb-3">{error}</Aviso>}
            <form onSubmit={enviar} noValidate>
              <div className="mb-4">
                <label className="form-label" htmlFor="email">Correo electrónico</label>
                <input id="email" type="email" className={`form-control ${errorCampo ? "is-invalid" : ""}`} autoComplete="email" autoFocus
                  placeholder="nombre@alpha.cl" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errorCampo} />
                {errorCampo && <div className="invalid-feedback d-block">{errorCampo}</div>}
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-100" disabled={enviando}>
                {enviando ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>
            <div className="mt-4"><Link to="/login" className="texto-secundario text-decoration-none">‹ Volver a iniciar sesión</Link></div>
          </>
        )}
      </main>
    </div>
  );
}

/** Problemas de una contraseña nueva (las mismas reglas del servidor). */
export function problemasContrasena(p: string) {
  if (p.length < 8) return "Debe tener al menos 8 caracteres";
  if (p.length > 72) return "Debe tener como máximo 72 caracteres";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Debe tener letras y números";
  return null;
}

/** Recuperar contraseña, paso 2: elegir la nueva contraseña con el enlace del correo. */
export function Restablecer() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [tocado, setTocado] = useState(false);
  const [error, setError] = useState<{ mensaje: string; vencido: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    document.title = "Nueva contraseña · Ferretería Alpha";
  }, []);

  const problema = problemasContrasena(password);
  const noCoinciden = repetir.length > 0 && password !== repetir;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTocado(true);
    if (problema || password !== repetir) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await api<{ mensaje: string }>("/auth/restablecer", { metodo: "POST", cuerpo: { token, password } });
      navegar("/login", { replace: true, state: { exito: r.mensaje } });
    } catch (err) {
      setError({ mensaje: mensajeDeError(err), vencido: err instanceof ErrorApi && err.campo === "token" });
      setEnviando(false);
    }
  }

  return (
    <div className="fondo-login">
      <main className="tarjeta-login">
        <div className="mb-4"><Logo oscuro /></div>
        <h1 className="titulo" style={{ fontSize: "1.6rem" }}>Elige una contraseña nueva</h1>
        {!token ? (
          <Aviso tipo="error" className="mt-4" titulo="El enlace está incompleto">
            Ábrelo directamente desde el correo o <Link to="/recuperar">pide uno nuevo</Link>.
          </Aviso>
        ) : (
          <>
            <p className="texto-secundario mt-1 mb-4">Debe tener al menos 8 caracteres, con letras y números.</p>
            {error && (
              <Aviso tipo="error" className="mb-3">
                {error.mensaje} {error.vencido && <Link to="/recuperar">Pedir un enlace nuevo</Link>}
              </Aviso>
            )}
            <form onSubmit={enviar} noValidate>
              <div className="mb-3">
                <label className="form-label" htmlFor="nueva">Contraseña nueva</label>
                <input id="nueva" type="password" autoComplete="new-password" autoFocus className={`form-control ${tocado && problema ? "is-invalid" : ""}`}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                {tocado && problema && <div className="invalid-feedback d-block">{problema}</div>}
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="repetir">Repite la contraseña</label>
                <input id="repetir" type="password" autoComplete="new-password" className={`form-control ${noCoinciden || (tocado && !repetir) ? "is-invalid" : ""}`}
                  value={repetir} onChange={(e) => setRepetir(e.target.value)} />
                {(noCoinciden || (tocado && !repetir)) && <div className="invalid-feedback d-block">Las contraseñas no coinciden</div>}
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-100" disabled={enviando}>
                {enviando ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}
        <div className="mt-4"><Link to="/login" className="texto-secundario text-decoration-none">‹ Volver a iniciar sesión</Link></div>
      </main>
    </div>
  );
}
