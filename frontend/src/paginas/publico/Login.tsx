import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { ErrorApi, mensajeDeError } from "../../api/cliente";
import { Aviso, Logo } from "../../componentes/Ui";
import { useSesion } from "../../contexto/Sesion";

/** RF05: inicio de sesión del personal. El error no dice qué dato falló (seguridad). */
export function Login() {
  const { usuario, ingresar } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const estado = ubicacion.state as { mensaje?: string; desde?: string; exito?: string } | null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ titulo: string; detalle: string; credenciales: boolean } | null>(null);

  useEffect(() => {
    document.title = "Acceso del personal · Ferretería Alpha";
  }, []);

  if (usuario && !enviando) return <Navigate to={estado?.desde ?? "/panel"} replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError({ titulo: "Faltan datos.", detalle: "Escribe tu correo y tu contraseña.", credenciales: false });
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await ingresar(email.trim(), password);
      navegar(estado?.desde ?? "/panel", { replace: true });
    } catch (err) {
      const esCredencial = err instanceof ErrorApi && err.codigo === "CREDENCIALES_INVALIDAS";
      setError({
        titulo: esCredencial ? "Correo o contraseña incorrectos." : mensajeDeError(err),
        detalle: esCredencial ? "Revisa los datos e inténtalo de nuevo." : "",
        credenciales: esCredencial,
      });
      setPassword("");
      setEnviando(false);
    }
  }

  return (
    <div className="fondo-login">
      <main className="tarjeta-login">
        <div className="mb-4"><Logo oscuro /></div>
        <h1 className="titulo" style={{ fontSize: "1.6rem" }}>Acceso del personal</h1>
        <p className="texto-secundario mt-1 mb-4" style={{ fontSize: "1rem" }}>Ingresa con tu correo de la ferretería.</p>

        {estado?.mensaje && !error && <Aviso tipo="info" className="mb-3">{estado.mensaje}</Aviso>}
        {estado?.exito && !error && <Aviso tipo="exito" className="mb-3">{estado.exito}</Aviso>}
        {error && (
          <Aviso tipo="error" titulo={error.titulo} className="mb-3">
            {error.detalle}
          </Aviso>
        )}

        <form onSubmit={enviar} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" className="form-control" autoComplete="username" placeholder="nombre@alpha.cl"
              value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input id="password" type="password" className="form-control" autoComplete="current-password" placeholder="Escribe tu contraseña"
              value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={error?.credenciales ? "ayuda-pass" : undefined} />
            {error?.credenciales && <div id="ayuda-pass" className="form-text">Por seguridad no indicamos cuál de los dos datos falló.</div>}
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-100" disabled={enviando}>
            {enviando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="d-flex justify-content-between flex-wrap gap-2 mt-4">
          <Link to="/recuperar" className="fw-semibold text-decoration-none">¿Olvidaste tu contraseña?</Link>
          <Link to="/" className="texto-secundario text-decoration-none">‹ Volver al catálogo</Link>
        </div>
      </main>
    </div>
  );
}
