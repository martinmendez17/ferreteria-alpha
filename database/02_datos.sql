-- =====================================================================
-- Ferretería Alpha · Script 02: datos de prueba
-- Ejecutar después de 01_esquema.sql:  psql "$DATABASE_URL" -f database/02_datos.sql
--
-- Usuarios de prueba (contraseñas guardadas con bcrypt vía pgcrypto):
--   maria.gonzalez@alpha.cl / Admin123!     (Administrador)
--   juan.perez@alpha.cl     / Vendedor123!  (Empleado)
--   ana.rojas@alpha.cl      / Vendedor123!  (Empleado)
-- El stock de cada producto coincide con sus entradas menos sus salidas.
-- =====================================================================

BEGIN;

INSERT INTO rol (nombreRol) VALUES ('Administrador'), ('Empleado');

INSERT INTO usuario (nombreCompleto, email, passwordHash, idRol) VALUES
  ('María González', 'maria.gonzalez@alpha.cl', crypt('Admin123!',    gen_salt('bf', 10)), 1),
  ('Juan Pérez',     'juan.perez@alpha.cl',     crypt('Vendedor123!', gen_salt('bf', 10)), 2),
  ('Ana Rojas',      'ana.rojas@alpha.cl',      crypt('Vendedor123!', gen_salt('bf', 10)), 2);

INSERT INTO categoria (nombre, descripcion) VALUES
  ('Herramientas manuales', 'Martillos, destornilladores, llaves y alicates'),
  ('Herramientas eléctricas', 'Taladros, esmeriles y herramientas a batería'),
  ('Plomería', 'Tuberías, fittings y llaves de paso'),
  ('Electricidad', 'Cables, enchufes e interruptores'),
  ('Pinturas', 'Látex, esmaltes y accesorios de pintura'),
  ('Fijaciones', 'Tornillos, tarugos y clavos'),
  ('Medición', 'Huinchas, niveles y escuadras'),
  ('Jardinería', 'Categoría nueva, todavía sin productos');

INSERT INTO proveedor (razonSocial, telefono, email) VALUES
  ('Distribuidora Andes SpA', '+56 2 2345 6701', 'ventas@distandes.cl'),
  ('Importadora Ferromax Ltda.', '+56 2 2890 1122', 'contacto@ferromax.cl'),
  ('Pinturas del Pacífico S.A.', '+56 32 245 7788', 'pedidos@pintpacifico.cl'),
  ('Suministros Eléctricos Sur', '+56 41 223 4455', 'ventas@elecsur.cl'),
  ('Comercial Norte Ltda.', '+56 55 244 1010', 'info@comnorte.cl');

INSERT INTO producto (sku, nombre, descripcion, precioVenta, idCategoria, idProveedor, unidadMedida, stockMinimo) VALUES
  ('HER-0016', 'Martillo carpintero 16 oz', 'Mango de fibra de vidrio y cabeza forjada.', 8990, 1, 2, 'unidad', 10),
  ('HER-0206', 'Destornillador paleta 6"', 'Punta imantada, mango ergonómico.', 2490, 1, 2, 'unidad', 15),
  ('ELE-0650', 'Taladro percutor 650 W', 'Mandril de 13 mm, velocidad variable.', 49990, 2, 2, 'unidad', 5),
  ('HER-0310', 'Llave ajustable 10"', 'Acero cromo vanadio.', 7990, 1, 1, 'unidad', 8),
  ('MED-0005', 'Huincha de medir 5 m', 'Cinta de acero con freno.', 4590, 7, 1, 'unidad', 8),
  ('PLO-0110', 'Tubo PVC sanitario 110 mm × 3 m', 'Para desagües domiciliarios.', 6990, 3, 1, 'unidad', 6),
  ('PIN-1001', 'Látex interior blanco 1 gal', 'Lavable, terminación mate.', 15990, 5, 3, 'galón', 12),
  ('FIJ-0812', 'Tornillo volcanita 8×1" (100 un)', 'Punta fina, cabeza trompeta.', 3290, 6, 1, 'caja', 15),
  ('ELE-0215', 'Cable eléctrico 2,5 mm² (rollo)', 'Rollo de 100 m, norma NCh.', 38990, 4, 4, 'rollo', 6),
  ('PLO-0020', 'Llave de paso 1/2"', 'Bronce, para agua fría y caliente.', 5490, 3, 1, 'unidad', 10),
  ('PIN-2004', 'Brocha 2"', 'Cerda sintética para látex y esmalte.', 1990, 5, 3, 'unidad', 20),
  ('FIJ-0610', 'Tarugo 6 mm (100 un)', 'Plástico para muros de hormigón.', 2190, 6, 1, 'caja', 10),
  ('HER-0412', 'Alicate universal 8"', 'Mango aislado.', 6490, 1, 2, 'unidad', 8),
  ('ELE-0110', 'Enchufe doble 10 A', 'Blanco, embutido.', 2890, 4, 4, 'unidad', 15),
  ('MED-0030', 'Escuadra metálica 30 cm', 'Graduada en cm y pulgadas.', 5990, 7, NULL, 'unidad', 4),
  ('ELE-0800', 'Esmeril angular 4½" 800 W', 'Incluye disco de corte.', 42990, 2, 2, 'unidad', 4);

INSERT INTO inventario (idProducto, stockActual, ubicacionBodega) VALUES
  (1, 48, 'Pasillo 1-A'),
  (2, 60, 'Pasillo 1-A'),
  (3, 14, 'Pasillo 2-B'),
  (4, 6, 'Pasillo 1-B'),
  (5, 11, 'Pasillo 1-C'),
  (6, 0, 'Patio'),
  (7, 36, 'Pasillo 4-A'),
  (8, 12, 'Pasillo 3-A'),
  (9, 22, 'Pasillo 2-C'),
  (10, 25, 'Pasillo 3-C'),
  (11, 70, 'Pasillo 4-B'),
  (12, 18, 'Pasillo 3-A'),
  (13, 20, 'Pasillo 1-B'),
  (14, 9, 'Pasillo 2-C'),
  (15, 7, 'Pasillo 1-C'),
  (16, 3, 'Pasillo 2-B');

-- Historial: una compra inicial por producto y luego sus salidas
INSERT INTO movimiento_inventario (idProducto, idUsuario, tipoMovimiento, cantidad, motivo, fechaHora) VALUES
  (1, 1, 'entrada', 60, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '20 days'),
  (1, 2, 'salida', 4, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '0 hours'),
  (1, 3, 'salida', 4, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '0 hours'),
  (1, 2, 'salida', 4, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '0 hours'),
  (2, 1, 'entrada', 80, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '21 days'),
  (2, 3, 'salida', 7, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '1 hours'),
  (2, 2, 'salida', 7, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '1 hours'),
  (2, 3, 'salida', 6, 'Merma', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '1 hours'),
  (3, 1, 'entrada', 18, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '22 days'),
  (3, 2, 'salida', 2, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '2 hours'),
  (3, 3, 'salida', 1, 'Merma', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '2 hours'),
  (3, 2, 'salida', 1, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '2 hours'),
  (4, 1, 'entrada', 15, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '23 days'),
  (4, 3, 'salida', 3, 'Merma', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '3 hours'),
  (4, 2, 'salida', 3, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '3 hours'),
  (4, 3, 'salida', 3, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '3 hours'),
  (5, 1, 'entrada', 18, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '24 days'),
  (5, 2, 'salida', 3, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '4 hours'),
  (5, 3, 'salida', 2, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '4 hours'),
  (5, 2, 'salida', 2, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '4 hours'),
  (6, 1, 'entrada', 10, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '20 days'),
  (6, 3, 'salida', 4, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '5 hours'),
  (6, 2, 'salida', 3, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '5 hours'),
  (6, 3, 'salida', 3, 'Merma', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '5 hours'),
  (7, 1, 'entrada', 50, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '21 days'),
  (7, 2, 'salida', 5, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '6 hours'),
  (7, 3, 'salida', 5, 'Merma', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '6 hours'),
  (7, 2, 'salida', 4, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '6 hours'),
  (8, 1, 'entrada', 50, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '22 days'),
  (8, 3, 'salida', 13, 'Merma', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '0 hours'),
  (8, 2, 'salida', 13, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '0 hours'),
  (8, 3, 'salida', 12, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '0 hours'),
  (9, 1, 'entrada', 27, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '23 days'),
  (9, 2, 'salida', 2, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '1 hours'),
  (9, 3, 'salida', 2, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '1 hours'),
  (9, 2, 'salida', 1, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '1 hours'),
  (10, 1, 'entrada', 33, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '24 days'),
  (10, 3, 'salida', 3, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '2 hours'),
  (10, 2, 'salida', 3, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '2 hours'),
  (10, 3, 'salida', 2, 'Merma', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '2 hours'),
  (11, 1, 'entrada', 100, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '20 days'),
  (11, 2, 'salida', 10, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '3 hours'),
  (11, 3, 'salida', 10, 'Merma', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '3 hours'),
  (11, 2, 'salida', 10, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '3 hours'),
  (12, 1, 'entrada', 30, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '21 days'),
  (12, 3, 'salida', 4, 'Merma', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '4 hours'),
  (12, 2, 'salida', 4, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '4 hours'),
  (12, 3, 'salida', 4, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '4 hours'),
  (13, 1, 'entrada', 26, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '22 days'),
  (13, 2, 'salida', 2, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '5 hours'),
  (13, 3, 'salida', 2, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '5 hours'),
  (13, 2, 'salida', 2, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '5 hours'),
  (14, 1, 'entrada', 30, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '23 days'),
  (14, 3, 'salida', 7, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '6 hours'),
  (14, 2, 'salida', 7, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '6 hours'),
  (14, 3, 'salida', 7, 'Merma', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '6 hours'),
  (15, 1, 'entrada', 10, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '24 days'),
  (15, 2, 'salida', 1, 'Venta', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '0 hours'),
  (15, 3, 'salida', 1, 'Merma', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '0 hours'),
  (15, 2, 'salida', 1, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '0 hours'),
  (16, 1, 'entrada', 8, 'Compra a proveedor', CURRENT_TIMESTAMP - INTERVAL '20 days'),
  (16, 3, 'salida', 2, 'Merma', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '1 hours'),
  (16, 2, 'salida', 2, 'Venta', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '1 hours'),
  (16, 3, 'salida', 1, 'Venta', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '1 hours');

COMMIT;
