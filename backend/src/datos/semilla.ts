import { ObjectId } from "mongodb";
import type { CategoriaDoc, MovimientoDoc, ProductoDoc, ProveedorDoc, Rol, TipoMovimiento } from "../types/modelos";
import { horaChileAUtc, hoyEnChile } from "../utils/fechas";

/*
 * Datos de prueba: los mismos de 02_datos.sql de la Entrega 1, ya con la
 * forma de documentos de MongoDB. Los _id son fijos para que coincidan con
 * los ejemplos JSON del informe (mongodb/ejemplos/).
 *
 * Usuarios de prueba:
 *   maria.gonzalez@alpha.cl / Admin123!     (Administrador)
 *   juan.perez@alpha.cl     / Vendedor123!  (Empleado)
 *   ana.rojas@alpha.cl      / Vendedor123!  (Empleado)
 */

const id = (sufijo: string) => new ObjectId(`6710a1f0c2e4b81a2c${sufijo.padStart(6, "0")}`);

export const usuarios: { _id: ObjectId; nombreCompleto: string; email: string; password: string; rol: Rol }[] = [
  { _id: id("1"), nombreCompleto: "María González", email: "maria.gonzalez@alpha.cl", password: "Admin123!", rol: "Administrador" },
  { _id: id("2"), nombreCompleto: "Juan Pérez", email: "juan.perez@alpha.cl", password: "Vendedor123!", rol: "Empleado" },
  { _id: id("3"), nombreCompleto: "Ana Rojas", email: "ana.rojas@alpha.cl", password: "Vendedor123!", rol: "Empleado" },
];

export const categorias: CategoriaDoc[] = [
  { _id: id("101"), nombre: "Herramientas manuales", descripcion: "Martillos, destornilladores, llaves y alicates" },
  { _id: id("102"), nombre: "Herramientas eléctricas", descripcion: "Taladros, esmeriles y herramientas a batería" },
  { _id: id("103"), nombre: "Plomería", descripcion: "Tuberías, fittings y llaves de paso" },
  { _id: id("104"), nombre: "Electricidad", descripcion: "Cables, enchufes e interruptores" },
  { _id: id("105"), nombre: "Pinturas", descripcion: "Látex, esmaltes y accesorios de pintura" },
  { _id: id("106"), nombre: "Fijaciones", descripcion: "Tornillos, tarugos y clavos" },
  { _id: id("107"), nombre: "Medición", descripcion: "Huinchas, niveles y escuadras" },
  { _id: id("108"), nombre: "Jardinería", descripcion: "Categoría nueva, todavía sin productos" },
];

export const proveedores: ProveedorDoc[] = [
  { _id: id("201"), razonSocial: "Distribuidora Andes SpA", telefono: "+56 2 2345 6701", email: "ventas@distandes.cl" },
  { _id: id("202"), razonSocial: "Importadora Ferromax Ltda.", telefono: "+56 2 2890 1122", email: "contacto@ferromax.cl" },
  { _id: id("203"), razonSocial: "Pinturas del Pacífico S.A.", telefono: "+56 32 245 7788", email: "pedidos@pintpacifico.cl" },
  { _id: id("204"), razonSocial: "Suministros Eléctricos Sur", telefono: "+56 41 223 4455", email: "ventas@elecsur.cl" },
  { _id: id("205"), razonSocial: "Comercial Norte Ltda.", telefono: "+56 55 244 1010", email: "info@comnorte.cl" },
];

const cat = (n: number) => ({ _id: categorias[n - 1]!._id, nombre: categorias[n - 1]!.nombre });
const prov = (n: number | null) => (n === null ? null : { _id: proveedores[n - 1]!._id, razonSocial: proveedores[n - 1]!.razonSocial });

// [sku, nombre, descripción, marca, precio, categoría, proveedor, unidad, mínimo, stock, ubicación, palabras clave]
type Fila = [string, string, string, string, number, number, number | null, string, number, number, string, string[]];
const filas: Fila[] = [
  ["HER-0016", "Martillo carpintero 16 oz", "Mango de fibra de vidrio y cabeza forjada.", "Forja Andina", 8990, 1, 2, "unidad", 10, 48, "Pasillo 1-A", ["martillo", "carpintería", "clavos", "fibra de vidrio"]],
  ["HER-0206", 'Destornillador paleta 6"', "Punta imantada, mango ergonómico.", "Forja Andina", 2490, 1, 2, "unidad", 15, 60, "Pasillo 1-A", ["destornillador", "paleta", "plano", "atornillar"]],
  ["ELE-0650", "Taladro percutor 650 W", "Mandril de 13 mm, velocidad variable.", "Voltecno", 49990, 2, 2, "unidad", 5, 14, "Pasillo 2-B", ["taladro", "percutor", "perforar", "concreto"]],
  ["HER-0310", 'Llave ajustable 10"', "Acero cromo vanadio.", "Forja Andina", 7990, 1, 1, "unidad", 8, 6, "Pasillo 1-B", ["llave", "inglesa", "ajustable", "tuercas"]],
  ["MED-0005", "Huincha de medir 5 m", "Cinta de acero con freno.", "Medix", 4590, 7, 1, "unidad", 8, 11, "Pasillo 1-C", ["huincha", "metro", "medir", "cinta"]],
  ["PLO-0110", "Tubo PVC sanitario 110 mm × 3 m", "Para desagües domiciliarios.", "Tubosur", 6990, 3, 1, "unidad", 6, 0, "Patio", ["tubo", "pvc", "desagüe", "cañería"]],
  ["PIN-1001", "Látex interior blanco 1 gal", "Lavable, terminación mate.", "Color Pacífico", 15990, 5, 3, "galón", 12, 36, "Pasillo 4-A", ["pintura", "látex", "blanco", "muros"]],
  ["FIJ-0812", 'Tornillo volcanita 8×1" (100 un)', "Punta fina, cabeza trompeta.", "Fijatec", 3290, 6, 1, "caja", 15, 12, "Pasillo 3-A", ["tornillo", "volcanita", "drywall", "yeso cartón"]],
  ["ELE-0215", "Cable eléctrico 2,5 mm² (rollo)", "Rollo de 100 m, norma NCh.", "Conducta", 38990, 4, 4, "rollo", 6, 22, "Pasillo 2-C", ["cable", "eléctrico", "rollo", "instalación"]],
  ["PLO-0020", 'Llave de paso 1/2"', "Bronce, para agua fría y caliente.", "Tubosur", 5490, 3, 1, "unidad", 10, 25, "Pasillo 3-C", ["llave de paso", "agua", "bronce", "gásfiter"]],
  ["PIN-2004", 'Brocha 2"', "Cerda sintética para látex y esmalte.", "Color Pacífico", 1990, 5, 3, "unidad", 20, 70, "Pasillo 4-B", ["brocha", "pintar", "pincel", "esmalte"]],
  ["FIJ-0610", "Tarugo 6 mm (100 un)", "Plástico para muros de hormigón.", "Fijatec", 2190, 6, 1, "caja", 10, 18, "Pasillo 3-A", ["tarugo", "muro", "hormigón", "colgar"]],
  ["HER-0412", 'Alicate universal 8"', "Mango aislado.", "Forja Andina", 6490, 1, 2, "unidad", 8, 20, "Pasillo 1-B", ["alicate", "cortar", "cable", "aislado"]],
  ["ELE-0110", "Enchufe doble 10 A", "Blanco, embutido.", "Conducta", 2890, 4, 4, "unidad", 15, 9, "Pasillo 2-C", ["enchufe", "toma", "corriente", "embutido"]],
  ["MED-0030", "Escuadra metálica 30 cm", "Graduada en cm y pulgadas.", "Medix", 5990, 7, null, "unidad", 4, 7, "Pasillo 1-C", ["escuadra", "ángulo", "medir", "carpintería"]],
  ["ELE-0800", 'Esmeril angular 4½" 800 W', "Incluye disco de corte.", "Voltecno", 42990, 2, 2, "unidad", 4, 3, "Pasillo 2-B", ["esmeril", "galletera", "cortar", "pulir"]],
];

/** Instante de referencia: hoy a las 10:05 hora de Chile. */
function horaBase() {
  const [y, m, d] = hoyEnChile().split("-").map(Number) as [number, number, number];
  return horaChileAUtc(y, m, d, 10, 5);
}

export function construirProductos(): ProductoDoc[] {
  const ahora = new Date();
  return filas.map(([sku, nombre, descripcion, marca, precio, c, p, unidad, minimo, stock, ubicacion, palabras], i) => ({
    _id: id(String(301 + i)),
    sku,
    nombre,
    descripcion,
    marca,
    precioVenta: precio,
    imagenUrl: `/img/productos/${sku}.svg`,
    unidadMedida: unidad,
    stockMinimo: minimo,
    estado: "activo" as const,
    palabrasClave: palabras,
    categoria: cat(c),
    proveedor: prov(p),
    inventario: { stockActual: stock, ubicacionBodega: ubicacion, fechaActualizacion: ahora },
  }));
}

/*
 * Historial: una compra inicial por producto y luego tres salidas, igual que
 * en la Entrega 1. Cada movimiento guarda el stock que dejó (stockResultante),
 * y el último coincide con el stock actual del producto.
 */
// [producto (1-16), usuario (1-3), tipo, cantidad, motivo, días atrás, horas]
type FilaMov = [number, number, TipoMovimiento, number, string, number, number];
const movimientos: FilaMov[] = [
  [1, 1, "entrada", 60, "Compra a proveedor", 20, 0], [1, 2, "salida", 4, "Venta", 10, 0], [1, 3, "salida", 4, "Venta", 7, 0], [1, 2, "salida", 4, "Venta", 4, 0],
  [2, 1, "entrada", 80, "Compra a proveedor", 21, 0], [2, 3, "salida", 7, "Venta", 10, 1], [2, 2, "salida", 7, "Venta", 7, 1], [2, 3, "salida", 6, "Merma", 4, 1],
  [3, 1, "entrada", 18, "Compra a proveedor", 22, 0], [3, 2, "salida", 2, "Venta", 10, 2], [3, 3, "salida", 1, "Merma", 7, 2], [3, 2, "salida", 1, "Venta", 4, 2],
  [4, 1, "entrada", 15, "Compra a proveedor", 23, 0], [4, 3, "salida", 3, "Merma", 10, 3], [4, 2, "salida", 3, "Venta", 7, 3], [4, 3, "salida", 3, "Venta", 4, 3],
  [5, 1, "entrada", 18, "Compra a proveedor", 24, 0], [5, 2, "salida", 3, "Venta", 10, 4], [5, 3, "salida", 2, "Venta", 7, 4], [5, 2, "salida", 2, "Venta", 4, 4],
  [6, 1, "entrada", 10, "Compra a proveedor", 20, 0], [6, 3, "salida", 4, "Venta", 10, 5], [6, 2, "salida", 3, "Venta", 7, 5], [6, 3, "salida", 3, "Merma", 4, 5],
  [7, 1, "entrada", 50, "Compra a proveedor", 21, 0], [7, 2, "salida", 5, "Venta", 10, 6], [7, 3, "salida", 5, "Merma", 7, 6], [7, 2, "salida", 4, "Venta", 4, 6],
  [8, 1, "entrada", 50, "Compra a proveedor", 22, 0], [8, 3, "salida", 13, "Merma", 10, 0], [8, 2, "salida", 13, "Venta", 7, 0], [8, 3, "salida", 12, "Venta", 4, 0],
  [9, 1, "entrada", 27, "Compra a proveedor", 23, 0], [9, 2, "salida", 2, "Venta", 10, 1], [9, 3, "salida", 2, "Venta", 7, 1], [9, 2, "salida", 1, "Venta", 4, 1],
  [10, 1, "entrada", 33, "Compra a proveedor", 24, 0], [10, 3, "salida", 3, "Venta", 10, 2], [10, 2, "salida", 3, "Venta", 7, 2], [10, 3, "salida", 2, "Merma", 4, 2],
  [11, 1, "entrada", 100, "Compra a proveedor", 20, 0], [11, 2, "salida", 10, "Venta", 10, 3], [11, 3, "salida", 10, "Merma", 7, 3], [11, 2, "salida", 10, "Venta", 4, 3],
  [12, 1, "entrada", 30, "Compra a proveedor", 21, 0], [12, 3, "salida", 4, "Merma", 10, 4], [12, 2, "salida", 4, "Venta", 7, 4], [12, 3, "salida", 4, "Venta", 4, 4],
  [13, 1, "entrada", 26, "Compra a proveedor", 22, 0], [13, 2, "salida", 2, "Venta", 10, 5], [13, 3, "salida", 2, "Venta", 7, 5], [13, 2, "salida", 2, "Venta", 4, 5],
  [14, 1, "entrada", 30, "Compra a proveedor", 23, 0], [14, 3, "salida", 7, "Venta", 10, 6], [14, 2, "salida", 7, "Venta", 7, 6], [14, 3, "salida", 7, "Merma", 4, 6],
  [15, 1, "entrada", 10, "Compra a proveedor", 24, 0], [15, 2, "salida", 1, "Venta", 10, 0], [15, 3, "salida", 1, "Merma", 7, 0], [15, 2, "salida", 1, "Venta", 4, 0],
  [16, 1, "entrada", 8, "Compra a proveedor", 20, 0], [16, 3, "salida", 2, "Merma", 10, 1], [16, 2, "salida", 2, "Venta", 7, 1], [16, 3, "salida", 1, "Venta", 4, 1],
];

export function construirMovimientos(productos: ProductoDoc[]): MovimientoDoc[] {
  const base = horaBase().getTime();
  const stock = new Map<number, number>();
  const ordenados = [...movimientos].sort((a, b) => b[5] * 24 - b[6] - (a[5] * 24 - a[6]));

  return ordenados.map(([nProd, nUsu, tipo, cantidad, motivo, dias, horas], i) => {
    const producto = productos[nProd - 1]!;
    const usuario = usuarios[nUsu - 1]!;
    const nuevo = (stock.get(nProd) ?? 0) + (tipo === "entrada" ? cantidad : -cantidad);
    stock.set(nProd, nuevo);
    return {
      _id: id(String(401 + i)),
      tipoMovimiento: tipo,
      cantidad,
      motivo,
      fechaHora: new Date(base - dias * 86_400_000 + horas * 3_600_000),
      stockResultante: nuevo,
      producto: { _id: producto._id, sku: producto.sku, nombre: producto.nombre },
      usuario: { _id: usuario._id, nombreCompleto: usuario.nombreCompleto },
    };
  });
}
