/*
 * Acceso seguro a localStorage: en modo privado o con el almacenamiento
 * bloqueado puede lanzar errores, y la aplicación debe seguir funcionando.
 */
export function leer<T>(clave: string): T | null {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? (JSON.parse(valor) as T) : null;
  } catch {
    return null;
  }
}

export function guardar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: la sesión dura hasta cerrar la pestaña */
  }
}

export function borrar(clave: string) {
  try {
    localStorage.removeItem(clave);
  } catch {
    /* nada que hacer */
  }
}
