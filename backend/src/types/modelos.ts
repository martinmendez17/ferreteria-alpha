import type { ObjectId } from "mongodb";

/*
 * Forma de los documentos de las 5 colecciones (informe, sección 8).
 * Regla del diseño: "lo que se lee junto, se guarda junto".
 *  - El rol va embebido en el usuario (solo hay 2 y se usan en cada inicio de sesión).
 *  - El inventario va embebido en el producto (relación 1:1, siempre se muestran juntos).
 *  - Categoría y proveedor van como "referencia extendida" (_id + el nombre que se muestra).
 *  - Los movimientos van en su propia colección porque crecen sin límite.
 */

export const ROLES = ["Administrador", "Empleado"] as const;
export type Rol = (typeof ROLES)[number];

export interface UsuarioDoc {
  _id: ObjectId;
  nombreCompleto: string;
  email: string;
  passwordHash: string;
  rol: Rol;
  estado: "activo" | "inactivo";
  fechaCreacion: Date;
  ultimoAcceso?: Date | null;
  /** Recuperación de contraseña: se guarda solo el hash del token, nunca el token. */
  recuperacion?: { tokenHash: string; expira: Date } | null;
}

export interface CategoriaDoc {
  _id: ObjectId;
  nombre: string;
  descripcion?: string | null;
}

export interface ProveedorDoc {
  _id: ObjectId;
  razonSocial: string;
  telefono?: string | null;
  email?: string | null;
}

export interface ProductoDoc {
  _id: ObjectId;
  sku: string;
  nombre: string;
  descripcion?: string | null;
  marca?: string | null;
  precioVenta: number;
  imagenUrl?: string | null;
  unidadMedida: string;
  stockMinimo: number;
  estado: "activo" | "descontinuado";
  palabrasClave: string[];
  categoria: { _id: ObjectId; nombre: string };
  proveedor: { _id: ObjectId; razonSocial: string } | null;
  inventario: { stockActual: number; ubicacionBodega?: string | null; fechaActualizacion: Date };
}

export const TIPOS_MOVIMIENTO = ["entrada", "salida"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

/** Motivos permitidos por tipo (los mismos de la ventana de registro en los bocetos). */
export const MOTIVOS: Record<TipoMovimiento, readonly string[]> = {
  entrada: ["Compra a proveedor", "Devolución de cliente", "Ajuste de conteo"],
  salida: ["Venta", "Merma", "Ajuste de conteo", "Devolución a proveedor"],
};

export interface MovimientoDoc {
  _id: ObjectId;
  tipoMovimiento: TipoMovimiento;
  cantidad: number;
  motivo: string;
  fechaHora: Date;
  /** Stock que quedó después del movimiento ("Stock después" en el historial). */
  stockResultante: number;
  /** Copias "foto" del momento: no se actualizan si después cambia el nombre. */
  producto: { _id: ObjectId; sku: string; nombre: string };
  usuario: { _id: ObjectId; nombreCompleto: string };
}
