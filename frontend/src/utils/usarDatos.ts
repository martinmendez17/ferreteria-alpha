import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorApi, mensajeDeError } from "../api/cliente";

/**
 * Carga datos de la API y entrega { datos, cargando, error, recargar }.
 * Si cambian las dependencias se cancela la petición anterior, así una
 * respuesta lenta no reemplaza a una más nueva.
 */
export function usarDatos<T>(cargar: (signal: AbortSignal) => Promise<T>, dependencias: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoError, setEstadoError] = useState(0);
  const [version, setVersion] = useState(0);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError(null);
    cargarRef
      .current(control.signal)
      .then((d) => {
        if (!control.signal.aborted) setDatos(d);
      })
      .catch((e) => {
        if (!control.signal.aborted && (e as Error).name !== "AbortError") {
          setError(mensajeDeError(e));
          setEstadoError(e instanceof ErrorApi ? e.status : 0);
        }
      })
      .finally(() => {
        if (!control.signal.aborted) setCargando(false);
      });
    return () => control.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { datos, cargando, error, estadoError, recargar, setDatos };
}

/** Devuelve el valor después de que el usuario deja de escribir (para búsquedas). */
export function usarRetraso<T>(valor: T, ms = 300) {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retrasado;
}
