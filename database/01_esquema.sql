-- =====================================================================
-- Ferretería Alpha · Script 01: creación del esquema (PostgreSQL 18)
-- ICI-324 Bases de Datos y Programación Web · Proyecto 1, Entrega 1
--
-- Crea las 7 tablas del modelo relacional (informe, sección 7) con
-- todas sus restricciones: PK, FK, UNIQUE, NOT NULL, CHECK y DEFAULT.
--
-- Uso:  psql "$DATABASE_URL" -f database/01_esquema.sql
-- El script se puede volver a ejecutar: primero borra las tablas si
-- existen (en orden inverso a sus dependencias) y luego las crea.
-- =====================================================================

-- Extensión para generar hashes bcrypt desde SQL (se usa en 02_datos.sql)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS movimiento_inventario;
DROP TABLE IF EXISTS inventario;
DROP TABLE IF EXISTS producto;
DROP TABLE IF EXISTS proveedor;
DROP TABLE IF EXISTS categoria;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS rol;

-- ---------------------------------------------------------------------
-- ROL: niveles de acceso (Administrador, Empleado)            RF08
-- ---------------------------------------------------------------------
CREATE TABLE rol (
    idRol       SERIAL       PRIMARY KEY,
    nombreRol   VARCHAR(30)  NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- USUARIO: personal interno que inicia sesión            RF05, RF16
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
    idUsuario       SERIAL        PRIMARY KEY,
    nombreCompleto  VARCHAR(120)  NOT NULL,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    passwordHash    VARCHAR(255)  NOT NULL,
    idRol           INTEGER       NOT NULL
                    REFERENCES rol (idRol) ON DELETE RESTRICT,
    estado          VARCHAR(10)   NOT NULL DEFAULT 'activo'
                    CHECK (estado IN ('activo', 'inactivo')),
    fechaCreacion   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- CATEGORIA y PROVEEDOR: datos de apoyo del catálogo           RF15
-- ---------------------------------------------------------------------
CREATE TABLE categoria (
    idCategoria  SERIAL        PRIMARY KEY,
    nombre       VARCHAR(80)   NOT NULL UNIQUE,
    descripcion  VARCHAR(255)
);

CREATE TABLE proveedor (
    idProveedor  SERIAL        PRIMARY KEY,
    razonSocial  VARCHAR(120)  NOT NULL,
    telefono     VARCHAR(20),
    email        VARCHAR(150)
);

-- ---------------------------------------------------------------------
-- PRODUCTO: catálogo de la ferretería              RF01–RF04, RF09
-- ---------------------------------------------------------------------
CREATE TABLE producto (
    idProducto    SERIAL         PRIMARY KEY,
    sku           VARCHAR(40)    NOT NULL UNIQUE,
    nombre        VARCHAR(150)   NOT NULL,
    descripcion   TEXT,
    precioVenta   NUMERIC(10,2)  NOT NULL CHECK (precioVenta >= 0),
    idCategoria   INTEGER        NOT NULL
                  REFERENCES categoria (idCategoria) ON DELETE RESTRICT,
    idProveedor   INTEGER
                  REFERENCES proveedor (idProveedor) ON DELETE RESTRICT,
    unidadMedida  VARCHAR(20)    NOT NULL,
    stockMinimo   INTEGER        NOT NULL DEFAULT 0 CHECK (stockMinimo >= 0),
    estado        VARCHAR(15)    NOT NULL DEFAULT 'activo'
                  CHECK (estado IN ('activo', 'descontinuado'))
);

-- ---------------------------------------------------------------------
-- INVENTARIO: stock actual, relación 1:1 con PRODUCTO     RF12, RF14
-- ---------------------------------------------------------------------
CREATE TABLE inventario (
    idInventario        SERIAL       PRIMARY KEY,
    idProducto          INTEGER      NOT NULL UNIQUE
                        REFERENCES producto (idProducto) ON DELETE RESTRICT,
    stockActual         INTEGER      NOT NULL DEFAULT 0 CHECK (stockActual >= 0),
    ubicacionBodega     VARCHAR(60),
    fechaActualizacion  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- MOVIMIENTO_INVENTARIO: historial (kardex)       RF10, RF11, RF13
-- ---------------------------------------------------------------------
CREATE TABLE movimiento_inventario (
    idMovimiento    SERIAL        PRIMARY KEY,
    idProducto      INTEGER       NOT NULL
                    REFERENCES producto (idProducto) ON DELETE RESTRICT,
    idUsuario       INTEGER       NOT NULL
                    REFERENCES usuario (idUsuario) ON DELETE RESTRICT,
    tipoMovimiento  VARCHAR(10)   NOT NULL
                    CHECK (tipoMovimiento IN ('entrada', 'salida', 'ajuste')),
    cantidad        INTEGER       NOT NULL CHECK (cantidad > 0),
    motivo          VARCHAR(100)  NOT NULL,
    fechaHora       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Índices de apoyo al rendimiento                               RNF03
-- (email y sku ya tienen índice por su restricción UNIQUE)
-- ---------------------------------------------------------------------
CREATE INDEX idx_producto_nombre     ON producto (nombre);
CREATE INDEX idx_producto_categoria  ON producto (idCategoria);
CREATE INDEX idx_movimiento_producto ON movimiento_inventario (idProducto, fechaHora DESC);
