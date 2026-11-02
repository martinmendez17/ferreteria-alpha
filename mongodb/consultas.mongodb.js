// =====================================================================
// Ferretería Alpha · Las 13 consultas de la Entrega 1 traducidas a MongoDB
// Archivo generado con: npm run db:consultas -- --exportar
//
// Cómo usarlo: en MongoDB Compass abre la pestaña "mongosh" (abajo), pega la
// línea db = db.getSiblingDB(...) y luego cada bloque, en orden. También sirve
// como "Playground" de la extensión de MongoDB para VS Code.
// Ejecutar sobre la base recién cargada (npm run db:cargar).
// =====================================================================
db = db.getSiblingDB("ferreteria_alpha");

// ---------------------------------------------------------------------
// C01 · INSERT · RF09: El Administrador registra un producto nuevo
// SQL (Entrega 1):
//   INSERT INTO producto (sku, nombre, descripcion, precioVenta, idCategoria, idProveedor, unidadMedida, stockMinimo)
//   VALUES ('MED-0060', 'Nivel de burbuja 60 cm', ..., 7490, (SELECT idCategoria ...), (SELECT idProveedor ...), 'unidad', 5);
// ---------------------------------------------------------------------
// La categoría y el proveedor se copian como "referencia extendida" (_id + nombre).
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
});

// ---------------------------------------------------------------------
// C02 · INSERT · RF09: Registro de stock del producto (relación 1:1)
// SQL (Entrega 1):
//   INSERT INTO inventario (idProducto, stockActual, ubicacionBodega)
//   VALUES ((SELECT idProducto FROM producto WHERE sku = 'MED-0060'), 0, 'Pasillo 1-C');
// ---------------------------------------------------------------------
// En SQL era otra tabla. En MongoDB el inventario ya se creó embebido en C01:
// solo se completa su ubicación en la bodega.
db.productos.updateOne(
  { sku: "MED-0060" },
  { $set: { "inventario.ubicacionBodega": "Pasillo 1-C" } }
);

// ---------------------------------------------------------------------
// C03 + C04 · INSERT + UPDATE (transacción) · RF10, RF13, RNF05: Entrada de 24 unidades: se guarda el movimiento y se suma al stock
// SQL (Entrega 1):
//   BEGIN;
//   INSERT INTO movimiento_inventario (idProducto, idUsuario, tipoMovimiento, cantidad, motivo) VALUES (..., 'entrada', 24, 'Compra a proveedor');
//   UPDATE inventario SET stockActual = stockActual + 24, fechaActualizacion = CURRENT_TIMESTAMP WHERE idProducto = ...;
//   COMMIT;
// ---------------------------------------------------------------------
const sesion = db.getMongo().startSession();
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
}

// ---------------------------------------------------------------------
// C05 · UPDATE · RF09: Baja lógica: el tubo PVC pasa a descontinuado
// SQL (Entrega 1):
//   UPDATE producto SET estado = 'descontinuado' WHERE sku = 'PLO-0110';
// ---------------------------------------------------------------------
db.productos.updateOne({ sku: "PLO-0110" }, { $set: { estado: "descontinuado" } });

// ---------------------------------------------------------------------
// C06 · SELECT · RF05: Datos que usa el inicio de sesión
// SQL (Entrega 1):
//   SELECT idUsuario, nombreCompleto, passwordHash, idRol FROM usuario
//   WHERE email = 'maria.gonzalez@alpha.cl' AND estado = 'activo';
// ---------------------------------------------------------------------
// El rol viene embebido: no hace falta unir con otra colección.
db.usuarios.findOne(
  { email: "maria.gonzalez@alpha.cl", estado: "activo" },
  { nombreCompleto: 1, passwordHash: 1, rol: 1 }
);

// ---------------------------------------------------------------------
// C07 · SELECT con JOIN · RF01, RF02, RF03: Catálogo filtrado: herramientas entre $2.000 y $50.000 con stock
// SQL (Entrega 1):
//   SELECT p.sku, p.nombre, c.nombre AS categoria, p.precioVenta, i.stockActual
//   FROM producto p JOIN categoria c ON ... JOIN inventario i ON ...
//   WHERE p.estado = 'activo' AND c.nombre IN ('Herramientas manuales', 'Herramientas eléctricas')
//     AND p.precioVenta BETWEEN 2000 AND 50000 AND i.stockActual > 0
//   ORDER BY p.nombre;
// ---------------------------------------------------------------------
// Los 3 JOIN desaparecen: el documento del producto ya trae la categoría y el stock.
db.productos.find(
  {
    estado: "activo",
    "categoria.nombre": { $in: ["Herramientas manuales", "Herramientas eléctricas"] },
    precioVenta: { $gte: 2000, $lte: 50000 },
    "inventario.stockActual": { $gt: 0 }
  },
  { _id: 0, sku: 1, nombre: 1, "categoria.nombre": 1, precioVenta: 1, "inventario.stockActual": 1 }
).sort({ nombre: 1 });

// ---------------------------------------------------------------------
// C08 · SELECT con JOIN · RF14: Productos en o bajo su stock mínimo
// SQL (Entrega 1):
//   SELECT p.sku, p.nombre, i.stockActual, p.stockMinimo, p.stockMinimo - i.stockActual AS faltante
//   FROM producto p JOIN inventario i ON i.idProducto = p.idProducto
//   WHERE p.estado = 'activo' AND i.stockActual <= p.stockMinimo
//   ORDER BY faltante DESC;
// ---------------------------------------------------------------------
// $expr compara dos campos del mismo documento (en SQL estaban en tablas distintas).
db.productos.aggregate([
  { $match: { estado: "activo", $expr: { $lte: ["$inventario.stockActual", "$stockMinimo"] } } },
  { $project: {
      _id: 0, sku: 1, nombre: 1, stockMinimo: 1,
      stockActual: "$inventario.stockActual",
      faltante: { $subtract: ["$stockMinimo", "$inventario.stockActual"] }
  } },
  { $sort: { faltante: -1 } }
]);

// ---------------------------------------------------------------------
// C09 · DELETE · RF15: Borrar la categoría “Jardinería” (no tiene productos)
// SQL (Entrega 1):
//   DELETE FROM categoria WHERE nombre = 'Jardinería';
//   -- Con productos, la FK (ON DELETE RESTRICT) lo impediría.
// ---------------------------------------------------------------------
// MongoDB no tiene claves foráneas: la regla RESTRICT se revisa antes de borrar.
const jardineria = db.categorias.findOne({ nombre: "Jardinería" });
if (db.productos.countDocuments({ "categoria._id": jardineria._id }) === 0) {
  db.categorias.deleteOne({ _id: jardineria._id });
}

// ---------------------------------------------------------------------
// C10 · DELETE · RF15: Borrar un proveedor sin productos asociados
// SQL (Entrega 1):
//   DELETE FROM proveedor WHERE razonSocial = 'Comercial Norte Ltda.'
//   AND NOT EXISTS (SELECT 1 FROM producto p WHERE p.idProveedor = proveedor.idProveedor);
// ---------------------------------------------------------------------
const norte = db.proveedores.findOne({ razonSocial: "Comercial Norte Ltda." });
if (db.productos.countDocuments({ "proveedor._id": norte._id }) === 0) {
  db.proveedores.deleteOne({ _id: norte._id });
}

// ---------------------------------------------------------------------
// C11 · ALTER · RF04: La ficha mostrará también la marca
// SQL (Entrega 1):
//   ALTER TABLE producto ADD COLUMN marca VARCHAR(60);
// ---------------------------------------------------------------------
// MongoDB no tiene ALTER TABLE: cada documento puede tener campos distintos.
// 1) Se agrega el campo a los documentos que no lo tienen (como el de C01)
db.productos.updateMany({ marca: { $exists: false } }, { $set: { marca: null } });
// 2) Se agrega el campo al validador actual, como obligatorio (texto o null)
const vProd = db.getCollectionInfos({ name: "productos" })[0].options.validator;
vProd.$jsonSchema.required.push("marca");
vProd.$jsonSchema.properties.marca = { bsonType: ["string", "null"], maxLength: 60 };
db.runCommand({ collMod: "productos", validator: vProd });

// ---------------------------------------------------------------------
// C12 · ALTER · RNF01, RNF06: Registrar el último acceso de cada usuario
// SQL (Entrega 1):
//   ALTER TABLE usuario ADD COLUMN ultimoAcceso TIMESTAMP;
// ---------------------------------------------------------------------
db.usuarios.updateMany({ ultimoAcceso: { $exists: false } }, { $set: { ultimoAcceso: null } });
const vUsu = db.getCollectionInfos({ name: "usuarios" })[0].options.validator;
vUsu.$jsonSchema.required.push("ultimoAcceso");
vUsu.$jsonSchema.properties.ultimoAcceso = { bsonType: ["date", "null"] };
db.runCommand({ collMod: "usuarios", validator: vUsu });

// ---------------------------------------------------------------------
// C13 · DROP · RNF03: Eliminar un índice que no servía
// SQL (Entrega 1):
//   DROP INDEX IF EXISTS idx_producto_nombre;
// ---------------------------------------------------------------------
// La búsqueda usa /texto/i (contiene), y un índice normal no sirve para eso:
// solo hacía más lenta cada escritura.
db.productos.dropIndex("idx_nombre");
