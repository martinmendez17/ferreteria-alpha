-- =====================================================================
-- Ferretería Alpha · Script 03: las 13 consultas del proyecto
-- 3 INSERT · 3 SELECT (2 con JOIN) · 2 UPDATE · 2 DELETE · 2 ALTER · 1 DROP
--
-- Ejecutar después de 01_esquema.sql y 02_datos.sql:
--   psql "$DATABASE_URL" -f database/03_consultas.sql
-- Cada consulta indica el requerimiento del informe que responde.
-- Para repetir la demostración desde cero, volver a correr 01 y 02.
-- =====================================================================

-- ---------------------------------------------------------------------
-- C01 · INSERT · RF09: el Administrador registra un producto nuevo
-- ---------------------------------------------------------------------
INSERT INTO producto (sku, nombre, descripcion, precioVenta, idCategoria, idProveedor, unidadMedida, stockMinimo)
VALUES ('MED-0060', 'Nivel de burbuja 60 cm', 'Cuerpo de aluminio, tres burbujas.', 7490,
        (SELECT idCategoria FROM categoria WHERE nombre = 'Medición'),
        (SELECT idProveedor FROM proveedor WHERE razonSocial = 'Distribuidora Andes SpA'),
        'unidad', 5);

-- ---------------------------------------------------------------------
-- C02 · INSERT · RF09: se crea su registro de stock (relación 1:1)
-- ---------------------------------------------------------------------
INSERT INTO inventario (idProducto, stockActual, ubicacionBodega)
VALUES ((SELECT idProducto FROM producto WHERE sku = 'MED-0060'), 0, 'Pasillo 1-C');

-- ---------------------------------------------------------------------
-- C03 + C04 · INSERT y UPDATE · RF10, RF13, RNF05
-- Entrada de stock: el movimiento y la actualización del stock van en
-- UNA transacción. Si una de las dos falla, no se guarda ninguna.
-- ---------------------------------------------------------------------
BEGIN;

-- C03 · INSERT · se registra el movimiento con su autor y fecha
INSERT INTO movimiento_inventario (idProducto, idUsuario, tipoMovimiento, cantidad, motivo)
VALUES ((SELECT idProducto FROM producto WHERE sku = 'MED-0060'),
        (SELECT idUsuario FROM usuario WHERE email = 'juan.perez@alpha.cl'),
        'entrada', 24, 'Compra a proveedor');

-- C04 · UPDATE · se suma la cantidad al stock actual
UPDATE inventario
SET    stockActual = stockActual + 24,
       fechaActualizacion = CURRENT_TIMESTAMP
WHERE  idProducto = (SELECT idProducto FROM producto WHERE sku = 'MED-0060');

COMMIT;

-- ---------------------------------------------------------------------
-- C05 · UPDATE · RF09: baja lógica de un producto descontinuado
-- (no se borra: su historial de movimientos debe conservarse, RNF06)
-- ---------------------------------------------------------------------
UPDATE producto
SET    estado = 'descontinuado'
WHERE  sku = 'PLO-0110';

-- ---------------------------------------------------------------------
-- C06 · SELECT (sin JOIN) · RF05: datos que usa el login
-- El backend compara la contraseña ingresada con passwordHash (bcrypt).
-- ---------------------------------------------------------------------
SELECT idUsuario, nombreCompleto, passwordHash, idRol
FROM   usuario
WHERE  email = 'maria.gonzalez@alpha.cl'
  AND  estado = 'activo';

-- ---------------------------------------------------------------------
-- C07 · SELECT con JOIN · RF01, RF02, RF03: catálogo filtrado
-- Productos activos de herramientas, entre $2.000 y $50.000, con stock.
-- ---------------------------------------------------------------------
SELECT p.sku, p.nombre, c.nombre AS categoria, p.precioVenta, i.stockActual
FROM   producto p
JOIN   categoria  c ON c.idCategoria = p.idCategoria
JOIN   inventario i ON i.idProducto  = p.idProducto
WHERE  p.estado = 'activo'
  AND  c.nombre IN ('Herramientas manuales', 'Herramientas eléctricas')
  AND  p.precioVenta BETWEEN 2000 AND 50000
  AND  i.stockActual > 0
ORDER  BY p.nombre;

-- ---------------------------------------------------------------------
-- C08 · SELECT con JOIN · RF14: productos en o bajo su stock mínimo
-- ---------------------------------------------------------------------
SELECT p.sku, p.nombre, i.stockActual, p.stockMinimo,
       p.stockMinimo - i.stockActual AS faltante
FROM   producto p
JOIN   inventario i ON i.idProducto = p.idProducto
WHERE  p.estado = 'activo'
  AND  i.stockActual <= p.stockMinimo
ORDER  BY faltante DESC;

-- ---------------------------------------------------------------------
-- C09 · DELETE · RF15: eliminar una categoría que no tiene productos
-- Si tuviera productos, la FK (ON DELETE RESTRICT) lo impediría:
--   DELETE FROM categoria WHERE nombre = 'Plomería';  -- ERROR 23503
-- ---------------------------------------------------------------------
DELETE FROM categoria
WHERE  nombre = 'Jardinería';

-- ---------------------------------------------------------------------
-- C10 · DELETE · RF15: eliminar un proveedor sin productos asociados
-- ---------------------------------------------------------------------
DELETE FROM proveedor
WHERE  razonSocial = 'Comercial Norte Ltda.'
  AND  NOT EXISTS (SELECT 1 FROM producto p WHERE p.idProveedor = proveedor.idProveedor);

-- ---------------------------------------------------------------------
-- C11 · ALTER · RF04: la ficha del producto mostrará también la marca
-- ---------------------------------------------------------------------
ALTER TABLE producto
ADD COLUMN marca VARCHAR(60);

-- ---------------------------------------------------------------------
-- C12 · ALTER · RNF01, RNF06: registrar el último acceso de cada usuario
-- ---------------------------------------------------------------------
ALTER TABLE usuario
ADD COLUMN ultimoAcceso TIMESTAMP;

-- ---------------------------------------------------------------------
-- C13 · DROP · RNF03: se elimina el índice sobre producto.nombre.
-- La búsqueda del catálogo usa ILIKE '%texto%' y un índice B-tree no
-- sirve para patrones que empiezan con '%': solo agregaba costo a cada
-- INSERT y UPDATE de productos sin acelerar ninguna consulta.
-- ---------------------------------------------------------------------
DROP INDEX IF EXISTS idx_producto_nombre;
