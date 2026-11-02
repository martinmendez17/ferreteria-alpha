import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { mensajeDeError } from "../api/cliente";
import { Aviso } from "./Ui";

/** Ventana emergente sobre la pantalla. Se cierra con Esc, con la × o haciendo clic fuera. */
export function Ventana({
  titulo, alCerrar, children, pie, grande = false,
}: { titulo: string; alCerrar: () => void; children: ReactNode; pie?: ReactNode; grande?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef(alCerrar);
  cerrarRef.current = alCerrar;

  // Se ejecuta una sola vez al abrir (si dependiera de alCerrar, movería el foco en cada render)
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && cerrarRef.current();
    document.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";
    // Lleva el foco al primer campo de la ventana
    const primero = ref.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button:not(.btn-cerrar)");
    primero?.focus();
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
      anterior?.focus?.();
    };
  }, []);

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div ref={ref} className={`ventana ${grande ? "grande" : ""}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="ventana-cabecera">
          <h2 id={id} className="subtitulo">{titulo}</h2>
          <button type="button" className="btn-cerrar" onClick={alCerrar} aria-label="Cerrar">×</button>
        </div>
        <div className="ventana-cuerpo">{children}</div>
        {pie && <div className="ventana-pie">{pie}</div>}
      </div>
    </div>
  );
}

/** Pide confirmar una acción (dar de baja, eliminar, desactivar). */
export function Confirmar({
  titulo, mensaje, textoBoton, peligro = false, alConfirmar, alCerrar,
}: {
  titulo: string;
  mensaje: ReactNode;
  textoBoton: string;
  peligro?: boolean;
  alConfirmar: () => Promise<unknown>;
  alCerrar: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      await alConfirmar();
      alCerrar();
    } catch (e) {
      setError(mensajeDeError(e));
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
          <button type="button" className={`btn ${peligro ? "btn-peligro-lleno" : "btn-primary"}`} onClick={confirmar} disabled={enviando}>
            {enviando ? "Guardando…" : textoBoton}
          </button>
        </>
      }
    >
      <div>{mensaje}</div>
      {error && <Aviso tipo="error" className="mt-3">{error}</Aviso>}
    </Ventana>
  );
}
