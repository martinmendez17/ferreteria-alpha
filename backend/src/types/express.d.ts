import type { ObjectId } from "mongodb";
import type { Rol } from "./modelos";

// Agrega a Request el usuario autenticado que deja el middleware de sesión.
export interface UsuarioAutenticado {
  _id: ObjectId;
  nombreCompleto: string;
  email: string;
  rol: Rol;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}
