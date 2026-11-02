/*
 * Las 13 consultas de la Entrega 1 (database/03_consultas.sql) traducidas a MongoDB.
 *
 *   npm run db:consultas              ejecuta las 13 en orden y muestra el resultado
 *   npm run db:consultas -- --exportar escribe ../mongodb/consultas.mongodb.js (versión para mongosh / Compass)
 *
 * Igual que en SQL, se ejecutan sobre la base recién cargada (npm run db:cargar)
 * y en orden: algunas dependen de las anteriores. Para repetirlas, vuelve a cargar la base.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Document } from "mongodb";
import { cliente, col, db } from "../src/config/db";
import { validadores } from "../src/config/esquema";

interface Consulta {
  codigo: string;
  tipoSql: string;
  titulo: string;
  requerimiento: string;
  sql: string;
  mongo: string;
  ejecutar: () => Promise<unknown>;
}

/** Copia un validador agregando un campo obligatorio (para C11 y C12). */
function validadorCon(coleccion: string, campo: string, esquemaCampo: Document) {
  const v = structuredClone(validadores[coleccion]!) as { $jsonSchema: { required: string[]; properties: Document } };
  v.$jsonSchema.required = [...new Set([...v.$jsonSchema.required, campo])];
  v.$jsonSchema.properties[campo] = esquemaCampo;
  return v;
}

const consultas: Consulta[] = [
  {
    codigo: "C01",
    tipoSql: "INSERT",
    titulo: "El Administrador registra un producto nuevo",
    requerimiento: "RF09",
    sql: `INSERT INTO producto (sku, nombre, descripcion, precioVenta, idCategoria, idProveedor, unidadMedida, stockMinimo)
VALUES ('MED-0060', 'Nivel de burbuja 60 cm', ..., 7490, (SELECT idCategoria ...), (SELECT idProveedor ...), 'unidad', 5);`,
    mongo: `// La categoría y el proveedor se copian como "referencia extendida" (_id + nombre).
// El inventario va embebido: se crea junto con el producto, con stock 0.
const medicion = db.categorias.findOne({ nombre: "Medición" });
const andes = db.proveedores.findOne({ razonSocial: "Distribuidora Andes SpA" });
db.productos.insertOne({
  sku: "MED-0060",
  nombre: "Nivel de burbuja 60 cm",
  descripcion: "Cuerpo de aluminio, tres burbujas.",
  precioVenta: 7490,
  unidadMedida: "unidad",
  stockMinimo: 5,
  estado: "activo",
  palabrasClave: ["nivel", "burbuja", "aluminio"],
  categoria: { _id: medicion._id, nombre: medicion.nombre },
  proveedor: { _id: andes._id, razonSocial: andes.razonSocial },
  inventario: { stockActual: 0, fechaActualizacion: new Date() }
});`,
    async ejecutar() {
      const medicion = await col.categorias.findOne({ nombre: "Medición" });
      const andes = await col.proveedores.findOne({ razonSocial: "Distribuidora Andes SpA" });
      if (!medicion || !andes) throw new Error("Falta la categoría o el proveedor: carga la base primero");
      return col.productos.insertOne({
        sku: "MED-0060",
        nombre: "Nivel de burbuja 60 cm",
        descripcion: "Cuerpo de aluminio, tres burbujas.",
        precioVenta: 7490,
        unidadMedida: "unidad",
        stockMinimo: 5,
        estado: "activo",
        palabrasClave: ["nivel", "burbuja", "aluminio"],
        categoria: { _id: medicion._id, nombre: medicion.nombre },
        proveedor: { _id: andes._id, razonSocial: andes.razonSocial },
        inventario: { stockActual: 0, fechaActualizacion: new Date() },
      } as never);
    },
  },
  {
    codigo: "C02",
    tipoSql: "INSERT",
    titulo: "Registro de stock del producto (relación 1:1)",
    requerimiento: "RF09",
    sql: `INSERT INTO inventario (idProducto, stockActual, ubicacionBodega)
VALUES ((SELECT idProducto FROM producto WHERE sku = 'MED-0060'), 0, 'Pasillo 1-C');`,
    mongo: `// En SQL era otra tabla. En MongoDB el inventario ya se creó embebido en C01:
// solo se completa su ubicación en la bodega.
db.productos.updateOne(
  { sku: "MED-0060" },
  { $set: { "inventario.ubicacionBodega": "Pasillo 1-C" } }
);`,
    ejecutar: () => col.productos.updateOne({ sku: "MED-0060" }, { $set: { "inventario.ubicacionBodega": "Pasillo 1-C" } }),
  },
  {
    codigo: "C03 + C04",
    tipoSql: "INSERT + UPDATE (transacción)",
    titulo: "Entrada de 24 unidades: se guarda el movimiento y se suma al stock",
    requerimiento: "RF10, RF13, RNF05",
    sql: `BEGIN;
INSERT INTO movimiento_inventario (idProducto, idUsuario, tipoMovimiento, cantidad, motivo) VALUES (..., 'entrada', 24, 'Compra a proveedor');
UPDATE inventario SET stockActual = stockActual + 24, fechaActualizacion = CURRENT_TIMESTAMP WHERE idProducto = ...;
COMMIT;`,
    mongo: `const sesion = db.getMongo().startSession();
sesion.startTransaction();
try {
  const productos = sesion.getDatabase("ferreteria_alpha").productos;
  const movimientos = sesion.getDatabase("ferreteria_alpha").movimientos;
  const juan = db.usuarios.findOne({ email: "juan.perez@alpha.cl" });

  // C04 · UPDATE: se suma la cantidad al stock
  const p = productos.findOneAndUpdate(
    { sku: "MED-0060" },
    { $inc: { "inventario.stockActual": 24 }, $set: { "inventario.fechaActualizacion": new Date() } },
    { returnNewDocument: true }
  );
  // C03 · INSERT: se registra el movimiento con su autor, la fecha y el stock que dejó
  movimientos.insertOne({
    tipoMovimiento: "entrada", cantidad: 24, motivo: "Compra a proveedor", fechaHora: new Date(),
    stockResultante: p.inventario.stockActual,
    producto: { _id: p._id, sku: p.sku, nombre: p.nombre },
    usuario: { _id: juan._id, nombreCompleto: juan.nombreCompleto }
  });
  sesion.commitTransaction();     // se guardan las dos o ninguna
} catch (e) {
  sesion.abortTransaction();
  throw e;
} finally {
  sesion.endSession();
}`,
    async ejecutar() {
      const sesion = cliente.startSession();
      try {
        return await sesion.withTransaction(async () => {
          const juan = await col.usuarios.findOne({ email: "juan.perez@alpha.cl" }, { session: sesion });
          const p = await col.productos.findOneAndUpdate(
            { sku: "MED-0060" },
            { $inc: { "inventario.stockActual": 24 }, $set: { "inventario.fechaActualizacion": new Date() } },
            { returnDocument: "after", session: sesion },
          );
          if (!p || !juan) throw new Error("Falta el producto MED-0060 (C01) o el usuario");
          await col.movimientos.insertOne(
            {
              tipoMovimiento: "entrada", cantidad: 24, motivo: "Compra a proveedor", fechaHora: new Date(),
              stockResultante: p.inventario.stockActual,
              producto: { _id: p._id, sku: p.sku, nombre: p.nombre },
              usuario: { _id: juan._id, nombreCompleto: juan.nombreCompleto },
            } as never,
            { session: sesion },
          );
          return { stockActual: p.inventario.stockActual };
        });
      } finally {
        await sesion.endSession();
      }
    },
  },
  {
    codigo: "C05",
    tipoSql: "UPDATE",
    titulo: "Baja lógica: el tubo PVC pasa a descontinuado",
    requerimiento: "RF09",
    sql: `UPDATE producto SET estado = 'descontinuado' WHERE sku = 'PLO-0110';`,
    mongo: `db.productos.updateOne({ sku: "PLO-0110" }, { $set: { estado: "descontinuado" } });`,
    ejecutar: () => col.productos.updateOne({ sku: "PLO-0110" }, { $set: { estado: "descontinuado" } }),
  },
  {
    codigo: "C06",
    tipoSql: "SELECT",
    titulo: "Datos que usa el inicio de sesión",
    requerimiento: "RF05",
    sql: `SELECT idUsuario, nombreCompleto, passwordHash, idRol FROM usuario
WHERE email = 'maria.gonzalez@alpha.cl' AND estado = 'activo';`,
    mongo: `// El rol viene embebido: no hace falta unir con otra colección.
db.usuarios.findOne(
  { email: "maria.gonzalez@alpha.cl", estado: "activo" },
  { nombreCompleto: 1, passwordHash: 1, rol: 1 }
);`,
    ejecutar: () =>
      col.usuarios.findOne({ email: "maria.gonzalez@alpha.cl", estado: "activo" }, { projection: { nombreCompleto: 1, passwordHash: 1, rol: 1 } }),
  },
  {
    codigo: "C07",
    tipoSql: "SELECT con JOIN",
    titulo: "Catálogo filtrado: herramientas entre $2.000 y $50.000 con stock",
    requerimiento: "RF01, RF02, RF03",
    sql: `SELECT p.sku, p.nombre, c.nombre AS categoria, p.precioVenta, i.stockActual
FROM producto p JOIN categoria c ON ... JOIN inventario i ON ...
WHERE p.estado = 'activo' AND c.nombre IN ('Herramientas manuales', 'Herramientas eléctricas')
  AND p.precioVenta BETWEEN 2000 AND 50000 AND i.stockActual > 0
ORDER BY p.nombre;`,
    mongo: `// Los 3 JOIN desaparecen: el documento del producto ya trae la categoría y el stock.
db.productos.find(
  {
    estado: "activo",
    "categoria.nombre": { $in: ["Herramientas manuales", "Herramientas eléctricas"] },
    precioVenta: { $gte: 2000, $lte: 50000 },
    "inventario.stockActual": { $gt: 0 }
  },
  { _id: 0, sku: 1, nombre: 1, "categoria.nombre": 1, precioVenta: 1, "inventario.stockActual": 1 }
).sort({ nombre: 1 });`,
    ejecutar: () =>
      col.productos
        .find(
          {
            estado: "activo",
            "categoria.nombre": { $in: ["Herramientas manuales", "Herramientas eléctricas"] },
            precioVenta: { $gte: 2000, $lte: 50000 },
            "inventario.stockActual": { $gt: 0 },
          },
          { projection: { _id: 0, sku: 1, nombre: 1, "categoria.nombre": 1, precioVenta: 1, "inventario.stockActual": 1 } },
        )
        .sort({ nombre: 1 })
        .toArray(),
  },
  {
    codigo: "C08",
    tipoSql: "SELECT con JOIN",
    titulo: "Productos en o bajo su stock mínimo",
    requerimiento: "RF14",
    sql: `SELECT p.sku, p.nombre, i.stockActual, p.stockMinimo, p.stockMinimo - i.stockActual AS faltante
FROM producto p JOIN inventario i ON i.idProducto = p.idProducto
WHERE p.estado = 'activo' AND i.stockActual <= p.stockMinimo
ORDER BY faltante DESC;`,
    mongo: `// $expr compara dos campos del mismo documento (en SQL estaban en tablas distintas).
db.productos.aggregate([
  { $match: { estado: "activo", $expr: { $lte: ["$inventario.stockActual", "$stockMinimo"] } } },
  { $project: {
      _id: 0, sku: 1, nombre: 1, stockMinimo: 1,
      stockActual: "$inventario.stockActual",
      faltante: { $subtract: ["$stockMinimo", "$inventario.stockActual"] }
  } },
  { $sort: { faltante: -1 } }
]);`,
    ejecutar: () =>
      col.productos
        .aggregate([
          { $match: { estado: "activo", $expr: { $lte: ["$inventario.stockActual", "$stockMinimo"] } } },
          {
            $project: {
              _id: 0, sku: 1, nombre: 1, stockMinimo: 1,
              stockActual: "$inventario.stockActual",
              faltante: { $subtract: ["$stockMinimo", "$inventario.stockActual"] },
            },
          },
          { $sort: { faltante: -1 } },
        ])
        .toArray(),
  },
  {
    codigo: "C09",
    tipoSql: "DELETE",
    titulo: "Borrar la categoría “Jardinería” (no tiene productos)",
    requerimiento: "RF15",
    sql: `DELETE FROM categoria WHERE nombre = 'Jardinería';
-- Con productos, la FK (ON DELETE RESTRICT) lo impediría.`,
    mongo: `// MongoDB no tiene claves foráneas: la regla RESTRICT se revisa antes de borrar.
const jardineria = db.categorias.findOne({ nombre: "Jardinería" });
if (db.productos.countDocuments({ "categoria._id": jardineria._id }) === 0) {
  db.categorias.deleteOne({ _id: jardineria._id });
}`,
    async ejecutar() {
      const c = await col.categorias.findOne({ nombre: "Jardinería" });
      if (!c) return "La categoría ya no existe";
      if ((await col.productos.countDocuments({ "categoria._id": c._id })) > 0) return "No se borra: tiene productos";
      return col.categorias.deleteOne({ _id: c._id });
    },
  },
  {
    codigo: "C10",
    tipoSql: "DELETE",
    titulo: "Borrar un proveedor sin productos asociados",
    requerimiento: "RF15",
    sql: `DELETE FROM proveedor WHERE razonSocial = 'Comercial Norte Ltda.'
AND NOT EXISTS (SELECT 1 FROM producto p WHERE p.idProveedor = proveedor.idProveedor);`,
    mongo: `const norte = db.proveedores.findOne({ razonSocial: "Comercial Norte Ltda." });
if (db.productos.countDocuments({ "proveedor._id": norte._id }) === 0) {
  db.proveedores.deleteOne({ _id: norte._id });
}`,
    async ejecutar() {
      const p = await col.proveedores.findOne({ razonSocial: "Comercial Norte Ltda." });
      if (!p) return "El proveedor ya no existe";
      if ((await col.productos.countDocuments({ "proveedor._id": p._id })) > 0) return "No se borra: tiene productos";
      return col.proveedores.deleteOne({ _id: p._id });
    },
  },
  {
    codigo: "C11",
    tipoSql: "ALTER",
    titulo: "La ficha mostrará también la marca",
    requerimiento: "RF04",
    sql: `ALTER TABLE producto ADD COLUMN marca VARCHAR(60);`,
    mongo: `// MongoDB no tiene ALTER TABLE: cada documento puede tener campos distintos.
// 1) Se agrega el campo a los documentos que no lo tienen (como el de C01)
db.productos.updateMany({ marca: { $exists: false } }, { $set: { marca: null } });
// 2) Se actualiza el validador para que el campo sea parte del esquema
db.runCommand({ collMod: "productos", validator: { /* validador con marca: string o null, obligatorio */ } });`,
    async ejecutar() {
      const r = await col.productos.updateMany({ marca: { $exists: false } }, { $set: { marca: null } });
      await db.command({ collMod: "productos", validator: validadorCon("productos", "marca", { bsonType: ["string", "null"], maxLength: 60 }) });
      return { documentosCompletados: r.modifiedCount, validador: "actualizado" };
    },
  },
  {
    codigo: "C12",
    tipoSql: "ALTER",
    titulo: "Registrar el último acceso de cada usuario",
    requerimiento: "RNF01, RNF06",
    sql: `ALTER TABLE usuario ADD COLUMN ultimoAcceso TIMESTAMP;`,
    mongo: `db.usuarios.updateMany({ ultimoAcceso: { $exists: false } }, { $set: { ultimoAcceso: null } });
db.runCommand({ collMod: "usuarios", validator: { /* validador con ultimoAcceso: date o null, obligatorio */ } });`,
    async ejecutar() {
      const r = await col.usuarios.updateMany({ ultimoAcceso: { $exists: false } }, { $set: { ultimoAcceso: null } });
      await db.command({ collMod: "usuarios", validator: validadorCon("usuarios", "ultimoAcceso", { bsonType: ["date", "null"] }) });
      return { documentosCompletados: r.modifiedCount, validador: "actualizado" };
    },
  },
  {
    codigo: "C13",
    tipoSql: "DROP",
    titulo: "Eliminar un índice que no servía",
    requerimiento: "RNF03",
    sql: `DROP INDEX IF EXISTS idx_producto_nombre;`,
    mongo: `// La búsqueda usa /texto/i (contiene), y un índice normal no sirve para eso:
// solo hacía más lenta cada escritura.
db.productos.dropIndex("idx_nombre");`,
    async ejecutar() {
      const existe = (await col.productos.indexes()).some((i) => i.name === "idx_nombre");
      if (!existe) return "El índice ya no existe";
      return col.productos.dropIndex("idx_nombre");
    },
  },
];

function exportar() {
  const destino = resolve(dirname(fileURLToPath(import.meta.url)), "../../mongodb/consultas.mongodb.js");
  const partes = consultas.map(
    (c) => `// ---------------------------------------------------------------------
// ${c.codigo} · ${c.tipoSql} · ${c.requerimiento}: ${c.titulo}
// SQL (Entrega 1):
${c.sql.split("\n").map((l) => `//   ${l}`).join("\n")}
// ---------------------------------------------------------------------
${c.mongo}
`,
  );
  const texto = `// =====================================================================
// Ferretería Alpha · Las 13 consultas de la Entrega 1 traducidas a MongoDB
// Archivo generado con: npm run db:consultas -- --exportar
//
// Cómo usarlo: en MongoDB Compass abre la pestaña "mongosh" (abajo), pega la
// línea db = db.getSiblingDB(...) y luego cada bloque, en orden. También sirve
// como "Playground" de la extensión de MongoDB para VS Code.
// Ejecutar sobre la base recién cargada (npm run db:cargar).
// =====================================================================
db = db.getSiblingDB("ferreteria_alpha");

${partes.join("\n")}`;
  writeFileSync(destino, texto, "utf8");
  console.log(`Escrito ${destino}`);
}

async function main() {
  if (process.argv.includes("--exportar")) return exportar();

  await cliente.connect();
  let correctas = 0;
  for (const c of consultas) {
    console.log(`\n=== ${c.codigo} · ${c.tipoSql} · ${c.titulo} (${c.requerimiento})`);
    try {
      const resultado = await c.ejecutar();
      console.dir(resultado, { depth: 4, colors: true });
      correctas++;
    } catch (e) {
      console.error("  ERROR:", e instanceof Error ? e.message : e);
    }
  }
  console.log(`\n${correctas} de ${consultas.length} bloques ejecutados correctamente (13 consultas).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => cliente.close());
