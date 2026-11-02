// Agrega a Request el usuario autenticado que deja el middleware de auth.
export interface UsuarioAutenticado {
  idUsuario: number;
  nombre: string;
  rol: string;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}
