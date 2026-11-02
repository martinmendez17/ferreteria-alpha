# Las 13 consultas del proyecto — Ferretería Alpha

Todas están en `03_consultas.sql` y se probaron sobre los datos de `02_datos.sql`.
La tabla muestra qué requerimiento del informe responde cada una.

| # | Tipo | Requerimiento | Qué hace |
|---|------|---------------|----------|
| C01 | INSERT | RF09 | Registra el producto nuevo “Nivel de burbuja 60 cm” |
| C02 | INSERT | RF09 | Crea su registro de stock en `inventario` (relación 1:1) |
| C03 | INSERT | RF10, RF13 | Registra una entrada de 24 unidades a nombre de Juan Pérez |
| C04 | UPDATE | RF10, RNF05 | Suma esas 24 unidades al stock, en la misma transacción que C03 |
| C05 | UPDATE | RF09, RNF06 | Da de baja lógica el tubo PVC (no se borra, conserva su historial) |
| C06 | SELECT | RF05 | Obtiene los datos que el login necesita para validar a un usuario |
| C07 | SELECT + JOIN | RF01, RF02, RF03 | Catálogo filtrado por categoría, rango de precio y stock |
| C08 | SELECT + JOIN | RF14 | Productos en o bajo su stock mínimo (alerta) |
| C09 | DELETE | RF15 | Elimina la categoría “Jardinería”, que no tiene productos |
| C10 | DELETE | RF15 | Elimina un proveedor que no tiene productos asociados |
| C11 | ALTER | RF04 | Agrega la columna `marca` a `producto` |
| C12 | ALTER | RNF01, RNF06 | Agrega la columna `ultimoAcceso` a `usuario` |
| C13 | DROP | RNF03 | Elimina un índice que no aceleraba la búsqueda del catálogo |

## Consultas SELECT en álgebra relacional

Notación: σ selección, π proyección, ⋈ reunión natural sobre la condición indicada, τ ordenamiento.

**C06 · Login (sin JOIN)**

```
π idUsuario, nombreCompleto, passwordHash, idRol (
    σ email = 'maria.gonzalez@alpha.cl' ∧ estado = 'activo' (USUARIO) )
```

Resultado con los datos de prueba: 1 fila (María González, rol 1).

**C07 · Catálogo filtrado (JOIN)**

```
τ nombre (
  π sku, PRODUCTO.nombre, CATEGORIA.nombre, precioVenta, stockActual (
    σ estado = 'activo'
      ∧ CATEGORIA.nombre ∈ {'Herramientas manuales', 'Herramientas eléctricas'}
      ∧ 2000 ≤ precioVenta ≤ 50000
      ∧ stockActual > 0 (
        ( PRODUCTO ⋈ PRODUCTO.idCategoria = CATEGORIA.idCategoria CATEGORIA )
          ⋈ PRODUCTO.idProducto = INVENTARIO.idProducto INVENTARIO ) ) )
```

Resultado: 6 productos.

**C08 · Stock crítico (JOIN)**

```
π sku, nombre, stockActual, stockMinimo (
  σ estado = 'activo' ∧ stockActual ≤ stockMinimo (
    PRODUCTO ⋈ PRODUCTO.idProducto = INVENTARIO.idProducto INVENTARIO ) )
```

Resultado después de C01–C05: 4 productos (enchufe doble, tornillo volcanita, llave ajustable y esmeril).
El tubo PVC no aparece porque C05 lo dio de baja.

## Restricciones que conviene mostrar en la defensa

Estas dos sentencias **fallan a propósito** y demuestran que las reglas están en la base de datos, no solo en el código:

```sql
-- La FK con ON DELETE RESTRICT impide borrar una categoría con productos
DELETE FROM categoria WHERE nombre = 'Plomería';
-- ERROR: update or delete on table "categoria" violates foreign key constraint

-- El CHECK impide dejar stock negativo (respaldo de RF12)
UPDATE inventario SET stockActual = stockActual - 999 WHERE idProducto = 1;
-- ERROR: new row for relation "inventario" violates check constraint
```

## Nota sobre los nombres de columnas

PostgreSQL pasa a minúsculas los nombres escritos sin comillas: la columna `idUsuario`
se guarda como `idusuario`. En SQL da lo mismo (se puede escribir de las dos formas);
en el backend, `schema.prisma` mapea cada campo con `@map` para usar los nombres del informe.
