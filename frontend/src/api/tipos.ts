/* Tipos de los datos que entrega la API (los _id llegan como texto). */

export type Rol = "Administrador" | "Empleado";
export type Disponibilidad = "disponible" | "ultimas_unidades" | "sin_stock";
export type EstadoStock = "normal" | "critico" | "sin_stock";
export type TipoMovimiento = "entrada" | "salida";

export interface Paginado<T> {
  datos: T[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export interface Usuario {
  _id: string;
  nombreCompleto: string;
  email: string;
  rol: Rol;
}

export interface UsuarioAdmin extends Usuario {
  estado: "activo" | "inactivo";
  fechaCreacion: string;
  ultimoAcceso: string | null;
  movimientos: number;
}

export interface Referencia {
  _id: string;
  nombre: string;
}

export interface ProductoPublico {
  _id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  marca: string | null;
  precioVenta: number;
  imagenUrl: string | null;
  unidadMedida: string;
  categoria: Referencia;
  disponibilidad: Disponibilidad;
}

export interface FichaProducto extends ProductoPublico {
  relacionados: ProductoPublico[];
}

export interface Inventario {
  stockActual: number;
  ubicacionBodega: string | null;
  fechaActualizacion: string;
}

export interface FilaInventario {
  _id: string;
  sku: string;
  nombre: string;
  marca: string | null;
  unidadMedida: string;
  stockMinimo: number;
  estadoStock: EstadoStock;
  categoria: Referencia;
  imagenUrl: string | null;
  inventario: Inventario;
}

export interface ProductoAdmin extends FilaInventario {
  descripcion: string | null;
  precioVenta: number;
  estado: "activo" | "descontinuado";
  palabrasClave: string[];
  proveedor: { _id: string; razonSocial: string } | null;
}

export interface Categoria {
  _id: string;
  nombre: string;
  descripcion: string | null;
  productosActivos: number;
  productosTotal: number;
}

export interface Proveedor {
  _id: string;
  razonSocial: string;
  telefono: string | null;
  email: string | null;
  productosTotal: number;
}

export interface Movimiento {
  _id: string;
  tipoMovimiento: TipoMovimiento;
  cantidad: number;
  motivo: string;
  fechaHora: string;
  stockResultante: number;
  producto: { _id: string; sku: string; nombre: string };
  usuario: { _id: string; nombreCompleto: string };
}

export interface ResultadoMovimiento {
  movimiento: Movimiento;
  producto: { _id: string; nombre: string; unidadMedida: string; stockMinimo: number };
  stockAnterior: number;
  stockActual: number;
  estadoStock: EstadoStock;
  alertaStockMinimo: boolean;
}

export interface Historial extends Paginado<Movimiento> {
  resumen: {
    entradas: number;
    salidas: number;
    producto: { _id: string; sku: string; nombre: string; stockActual: number; stockMinimo: number; estadoStock: EstadoStock; unidadMedida: string } | null;
  };
}

export interface ResumenInventario {
  productosActivos: number;
  enStockCritico: number;
  movimientosHoy: number;
}

export interface ParametroReporte {
  nombre: string;
  etiqueta: string;
  tipo: "fecha" | "numero" | "opcion" | "categorias";
  opciones?: { valor: string; etiqueta: string }[];
  porDefecto: string | number;
}

export interface ColumnaReporte {
  clave: string;
  etiqueta: string;
  tipo: "texto" | "numero" | "dinero" | "fecha" | "dia";
}

export interface InfoReporte {
  id: string;
  titulo: string;
  descripcion: string;
  conceptos: string[];
  requerimiento: string;
  coleccion: string;
  parametros: ParametroReporte[];
  columnas: ColumnaReporte[];
}

export interface ResultadoReporte {
  id: string;
  titulo: string;
  columnas: ColumnaReporte[];
  grafico: { etiqueta: string; valor: string; titulo: string } | null;
  filas: Record<string, unknown>[];
  milisegundos: number;
  consultaMongo: string;
  consultaSql: string;
}

/** Motivos permitidos por tipo (los mismos que valida el servidor). */
export const MOTIVOS: Record<TipoMovimiento, string[]> = {
  entrada: ["Compra a proveedor", "Devolución de cliente", "Ajuste de conteo"],
  salida: ["Venta", "Merma", "Ajuste de conteo", "Devolución a proveedor"],
};
