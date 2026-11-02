import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { api, configurarSesion } from "../api/cliente";
import type { Usuario } from "../api/tipos";
import { borrar, guardar, leer } from "../utils/almacen";

interface DatosSesion {
  token: string;
  usuario: Usuario;
}

interface ContextoSesion {
  usuario: Usuario | null;
  esAdmin: boolean;
  ingresar: (email: string, password: string) => Promise<Usuario>;
  salir: (mensaje?: string) => void;
}

const Contexto = createContext<ContextoSesion | null>(null);
const CLAVE = "fa_sesion";

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const navegar = useNavigate();
  const [sesion, setSesion] = useState<DatosSesion | null>(() => {
    const guardada = leer<DatosSesion>(CLAVE);
    configurarSesion(guardada?.token ?? null);
    return guardada;
  });

  const salir = useCallback(
    (mensaje?: string) => {
      borrar(CLAVE);
      configurarSesion(null);
      setSesion(null);
      // Al cerrar sesión se vuelve al catálogo; si la sesión expiró, al login con el aviso
      if (mensaje) navegar("/login", { replace: true, state: { mensaje } });
      else navegar("/", { replace: true });
    },
    [navegar],
  );

  // Si la API responde 401 (sesión vencida o cuenta desactivada), se cierra la sesión
  useEffect(() => {
    configurarSesion(sesion?.token ?? null, (mensaje) => salir(mensaje));
  }, [sesion, salir]);

  // Al abrir la página se comprueba que la sesión guardada siga siendo válida
  useEffect(() => {
    if (!sesion) return;
    api<{ usuario: Usuario }>("/auth/perfil")
      .then(({ usuario }) => {
        const nueva = { token: sesion.token, usuario };
        guardar(CLAVE, nueva);
        setSesion(nueva);
      })
      .catch(() => {
        /* el 401 ya lo maneja configurarSesion; otros errores (sin conexión) no cierran la sesión */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ingresar = useCallback(async (email: string, password: string) => {
    const r = await api<DatosSesion>("/auth/login", { metodo: "POST", cuerpo: { email, password } });
    guardar(CLAVE, r);
    configurarSesion(r.token);
    setSesion(r);
    return r.usuario;
  }, []);

  const valor = useMemo<ContextoSesion>(
    () => ({ usuario: sesion?.usuario ?? null, esAdmin: sesion?.usuario.rol === "Administrador", ingresar, salir }),
    [sesion, ingresar, salir],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  return c;
}
