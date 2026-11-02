import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Tipo = "exito" | "error" | "info" | "atencion";

interface Aviso {
  id: number;
  tipo: Tipo;
  titulo: string;
  mensaje?: ReactNode;
  detalle?: string;
}

interface ContextoAvisos {
  avisar: (a: Omit<Aviso, "id">) => void;
}

const Contexto = createContext<ContextoAvisos | null>(null);
const ICONOS: Record<Tipo, string> = { exito: "✓", error: "!", info: "i", atencion: "!" };
const CLASES: Record<Tipo, string> = { exito: "aviso-exito", error: "aviso-error", info: "aviso-info", atencion: "aviso-atencion" };

/** Avisos flotantes (arriba a la derecha) para confirmar acciones, como en el boceto "salida registrada". */
export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const cerrar = useCallback((id: number) => setAvisos((l) => l.filter((a) => a.id !== id)), []);
  const avisar = useCallback(
    (a: Omit<Aviso, "id">) => {
      const id = Date.now() + Math.random();
      setAvisos((l) => [...l.slice(-2), { ...a, id }]);
      setTimeout(() => cerrar(id), a.tipo === "error" ? 9000 : 6000);
    },
    [cerrar],
  );

  const valor = useMemo(() => ({ avisar }), [avisar]);
  return (
    <Contexto.Provider value={valor}>
      {children}
      <div className="contenedor-avisos" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso-flotante ${a.tipo}`} role={a.tipo === "error" ? "alert" : "status"}>
            <div className={`aviso ${CLASES[a.tipo]} p-0 border-0 bg-transparent`}>
              <span className="aviso-icono">{ICONOS[a.tipo]}</span>
            </div>
            <div className="flex-grow-1">
              <div className="fw-bold" style={{ fontSize: "1rem" }}>{a.titulo}</div>
              {a.mensaje && <div className="mt-1">{a.mensaje}</div>}
              {a.detalle && <div className="texto-secundario mt-1" style={{ fontSize: "0.8125rem" }}>{a.detalle}</div>}
            </div>
            <button type="button" className="btn-cerrar align-self-start" aria-label="Cerrar aviso" onClick={() => cerrar(a.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useAvisos() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useAvisos debe usarse dentro de ProveedorAvisos");
  return c;
}
