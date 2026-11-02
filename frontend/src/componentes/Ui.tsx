import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Disponibilidad, EstadoStock } from "../api/tipos";

export function Logo({ a = "/", oscuro = false }: { a?: string; oscuro?: boolean }) {
  return (
    <Link to={a} className="logo" style={oscuro ? { color: "var(--fa-grafito)" } : undefined} aria-label="Ferretería Alpha, ir al inicio">
      <span className="logo-marca" aria-hidden="true">A</span>
      <span>Ferretería Alpha</span>
    </Link>
  );
}

type TipoAviso = "exito" | "error" | "atencion" | "info";
const ICONO: Record<TipoAviso, string> = { exito: "✓", error: "!", atencion: "!", info: "i" };

/** Mensaje dentro de la página: confirmación, error, atención o información (guía de estilo, punto 6). */
export function Aviso({ tipo, titulo, children, className = "" }: { tipo: TipoAviso; titulo?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={`aviso aviso-${tipo} ${className}`} role={tipo === "error" ? "alert" : "status"}>
      <span className="aviso-icono" aria-hidden="true">{ICONO[tipo]}</span>
      <div>
        {titulo && <strong className="d-block">{titulo}</strong>}
        {children}
      </div>
    </div>
  );
}

const DISPONIBILIDAD: Record<Disponibilidad, [string, string]> = {
  disponible: ["Disponible", "estado-ok"],
  ultimas_unidades: ["Últimas unidades", "estado-alerta"],
  sin_stock: ["Sin stock", "estado-error"],
};
const ESTADO_INTERNO: Record<EstadoStock, [string, string]> = {
  normal: ["Normal", "estado-ok"],
  critico: ["Crítico", "estado-alerta"],
  sin_stock: ["Sin stock", "estado-error"],
};

/** Estado del stock para el catálogo público. */
export function EtiquetaDisponibilidad({ valor }: { valor: Disponibilidad }) {
  const [texto, clase] = DISPONIBILIDAD[valor];
  return <span className={`estado ${clase}`}>{texto}</span>;
}

/** Estado del stock para el panel interno. */
export function EtiquetaEstado({ valor }: { valor: EstadoStock }) {
  const [texto, clase] = ESTADO_INTERNO[valor];
  return <span className={`estado ${clase}`}>{texto}</span>;
}

export function ChipAdmin() {
  return <span className="chip-admin" title="Solo Administrador">ADMIN</span>;
}

/** Paginación con flechas y números (muestra hasta 5 números alrededor de la página actual). */
export function Paginacion({ pagina, totalPaginas, alCambiar }: { pagina: number; totalPaginas: number; alCambiar: (p: number) => void }) {
  if (totalPaginas <= 1) return null;
  const inicio = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
  const numeros = Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => inicio + i);
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button type="button" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)} aria-label="Página anterior">‹</button>
      {numeros.map((n) => (
        <button key={n} type="button" className={n === pagina ? "activa" : ""} aria-current={n === pagina ? "page" : undefined} onClick={() => alCambiar(n)}>
          {n}
        </button>
      ))}
      <button type="button" disabled={pagina >= totalPaginas} onClick={() => alCambiar(pagina + 1)} aria-label="Página siguiente">›</button>
    </nav>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="d-flex align-items-center gap-2 texto-secundario py-4 justify-content-center" role="status">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      {texto}
    </div>
  );
}

/** Error al cargar una sección, con botón para reintentar. */
export function ErrorCarga({ mensaje, alReintentar }: { mensaje: string; alReintentar?: () => void }) {
  return (
    <Aviso tipo="error" titulo="No se pudieron cargar los datos" className="m-3">
      <div>{mensaje}</div>
      {alReintentar && (
        <button type="button" className="btn btn-secundario btn-sm mt-2" onClick={alReintentar}>
          Reintentar
        </button>
      )}
    </Aviso>
  );
}

export function IconoLupaVacia({ tamano = 64 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" aria-hidden="true">
      <circle cx="27" cy="27" r="18" />
      <path d="M40 40l14 14M19 27h16" />
    </svg>
  );
}

export function Kpi({ etiqueta, valor, alerta = false, children }: { etiqueta: string; valor: ReactNode; alerta?: boolean; children?: ReactNode }) {
  return (
    <div className={`kpi ${alerta ? "kpi-alerta" : ""}`}>
      <div className="kpi-etiqueta">{etiqueta}</div>
      <div className="kpi-valor tabular d-flex align-items-center gap-2">{valor}{children}</div>
    </div>
  );
}
