import type { CreateIndexesOptions, Document, IndexSpecification } from "mongodb";

/*
 * Reglas de integridad de la base (informe, sección 8):
 *   CHECK de SQL        ->  validador $jsonSchema de cada colección
 *   UNIQUE de SQL       ->  índice único
 *   ON DELETE RESTRICT  ->  lo revisa el servidor antes de borrar (services/)
 * Lo usa scripts/cargar-base.ts para crear las colecciones.
 */

const fecha = { bsonType: "date" };
const texto = (max: number) => ({ bsonType: "string", minLength: 1, maxLength: max });
const textoOpcional = (max: number) => ({ bsonType: ["string", "null"], maxLength: max });
const entero = (minimo: number) => ({ bsonType: ["int", "long"], minimum: minimo });
const referencia = (campo: string) => ({
  bsonType: "object",
  required: ["_id", campo],
  properties: { _id: { bsonType: "objectId" }, [campo]: { bsonType: "string" } },
});

export const validadores: Record<string, Document> = {
  usuarios: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombreCompleto", "email", "passwordHash", "rol", "estado", "fechaCreacion"],
      properties: {
        nombreCompleto: texto(120),
        email: { bsonType: "string", pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", maxLength: 150 },
        passwordHash: texto(255),
        rol: { enum: ["Administrador", "Empleado"] },
        estado: { enum: ["activo", "inactivo"] },
        fechaCreacion: fecha,
        ultimoAcceso: { bsonType: ["date", "null"] },
        recuperacion: { bsonType: ["object", "null"] },
      },
    },
  },
  categorias: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre"],
      properties: { nombre: texto(80), descripcion: textoOpcional(255) },
    },
  },
  proveedores: {
    $jsonSchema: {
      bsonType: "object",
      required: ["razonSocial"],
      properties: { razonSocial: texto(120), telefono: textoOpcional(20), email: textoOpcional(150) },
    },
  },
  productos: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sku", "nombre", "precioVenta", "unidadMedida", "stockMinimo", "estado", "categoria", "inventario"],
      properties: {
        sku: texto(40),
        nombre: texto(150),
        descripcion: textoOpcional(2000),
        marca: textoOpcional(60),
        precioVenta: { bsonType: ["int", "long", "double"], minimum: 0 }, // CHECK (precioVenta >= 0)
        imagenUrl: textoOpcional(500),
        unidadMedida: texto(20),
        stockMinimo: entero(0), // CHECK (stockMinimo >= 0)
        estado: { enum: ["activo", "descontinuado"] },
        palabrasClave: { bsonType: "array", items: { bsonType: "string" } },
        categoria: referencia("nombre"),
        proveedor: { oneOf: [{ bsonType: "null" }, referencia("razonSocial")] },
        inventario: {
          bsonType: "object",
          required: ["stockActual", "fechaActualizacion"],
          properties: {
            stockActual: entero(0), // CHECK (stockActual >= 0): el stock nunca queda negativo
            ubicacionBodega: textoOpcional(60),
            fechaActualizacion: fecha,
          },
        },
      },
    },
  },
  movimientos: {
    $jsonSchema: {
      bsonType: "object",
      required: ["tipoMovimiento", "cantidad", "motivo", "fechaHora", "stockResultante", "producto", "usuario"],
      properties: {
        tipoMovimiento: { enum: ["entrada", "salida"] },
        cantidad: entero(1), // CHECK (cantidad > 0)
        motivo: texto(100),
        fechaHora: fecha,
        stockResultante: entero(0),
        producto: {
          bsonType: "object",
          required: ["_id", "sku", "nombre"],
          properties: { _id: { bsonType: "objectId" }, sku: { bsonType: "string" }, nombre: { bsonType: "string" } },
        },
        usuario: referencia("nombreCompleto"),
      },
    },
  },
};

/** Sin distinguir mayúsculas: "Plomería" y "plomería" cuentan como el mismo nombre. */
const sinMayusculas = { locale: "es", strength: 2 } as const;

export const indices: Record<string, { clave: IndexSpecification; opciones: CreateIndexesOptions }[]> = {
  usuarios: [{ clave: { email: 1 }, opciones: { name: "uq_email", unique: true } }],
  categorias: [{ clave: { nombre: 1 }, opciones: { name: "uq_nombre", unique: true, collation: sinMayusculas } }],
  proveedores: [{ clave: { razonSocial: 1 }, opciones: { name: "idx_razonSocial" } }],
  productos: [
    { clave: { sku: 1 }, opciones: { name: "uq_sku", unique: true } },
    { clave: { "categoria._id": 1, estado: 1 }, opciones: { name: "idx_categoria_estado" } },
    { clave: { "proveedor._id": 1 }, opciones: { name: "idx_proveedor" } },
    // Este índice es el que elimina la consulta C13 (no sirve para buscar con /texto/i)
    { clave: { nombre: 1 }, opciones: { name: "idx_nombre" } },
  ],
  movimientos: [
    { clave: { "producto._id": 1, fechaHora: -1 }, opciones: { name: "idx_producto_fecha" } },
    { clave: { fechaHora: -1 }, opciones: { name: "idx_fecha" } },
    { clave: { "usuario._id": 1 }, opciones: { name: "idx_usuario" } },
  ],
};
