# API REST de Ferretería Alpha · Documentación

Versión 2.0 (Entrega 2) · Node.js + Express 5 + MongoDB

## 1. Introducción

La API entrega los datos del catálogo público y del inventario interno de Ferretería Alpha. El frontend (React) la usa para todas sus pantallas, y también se puede probar con Postman, Thunder Client o el archivo `backend/requests.http`.

- **Dirección base (local):** `http://localhost:3000/api`
- **Dirección base (publicada):** `https://<tu-servicio>.onrender.com/api`
- **Formato:** todas las peticiones y respuestas usan JSON (`Content-Type: application/json`) y texto en UTF-8.
- **Identificadores:** los `_id` son los `ObjectId` de MongoDB, enviados como texto de 24 caracteres (ej. `6710a1f0c2e4b81a2c000301`).
- **Fechas:** se envían en formato ISO 8601 y en UTC (`2026-10-19T14:42:00.000Z`). Los filtros por día (`desde`, `hasta`) usan `AAAA-MM-DD` y se interpretan en hora de Chile.
- **Dinero:** pesos chilenos como números enteros, sin decimales.

## 2. Autenticación y autorización

1. El personal inicia sesión con `POST /auth/login` y recibe un **token JWT** que dura 8 horas.
2. Cada petición protegida debe llevar el encabezado:
   ```
   Authorization: Bearer <token>
   ```
3. En cada petición el servidor revisa la firma del token y además que la cuenta **siga activa** en la base: si el Administrador desactiva a alguien, su token deja de servir de inmediato.

| Nivel de acceso | Quién | Rutas |
|---|---|---|
| Público | Cualquier visitante | Catálogo, ficha, categorías, login y recuperación de contraseña |
| Sesión | Empleado y Administrador | Inventario, movimientos, proveedores (ver), reportes |
| Administrador | Solo Administrador | Crear/editar productos, categorías, proveedores y usuarios |

## 3. Formato de errores

Todos los errores responden con la misma forma, para que el frontend sepa siempre dónde leer el mensaje:

```json
{
  "error": "La cantidad supera el stock disponible (12 unidades)",
  "codigo": "STOCK_INSUFICIENTE",
  "detalles": { "campo": "cantidad", "stockDisponible": 12 }
}
```

`detalles.campo` indica qué campo del formulario tiene el problema, para marcarlo en rojo.

| Código HTTP | Cuándo ocurre | `codigo` |
|---|---|---|
| 200 OK | Consulta o actualización correcta | — |
| 201 Created | Se creó un registro (producto, movimiento, usuario…) | — |
| 204 No Content | Se eliminó una categoría o proveedor | — |
| 400 Bad Request | Id con formato inválido, JSON mal escrito, parámetros de búsqueda inválidos, fechas al revés | `PETICION_INVALIDA`, `JSON_INVALIDO` |
| 401 Unauthorized | Falta el token, está vencido o la cuenta se desactivó; correo o contraseña incorrectos | `NO_AUTENTICADO`, `CREDENCIALES_INVALIDAS` |
| 403 Forbidden | Un Empleado intenta una acción de Administrador; cuenta desactivada al iniciar sesión | `SIN_PERMISO`, `CUENTA_INACTIVA` |
| 404 Not Found | El producto, categoría, usuario o ruta no existe | `NO_ENCONTRADO`, `RUTA_NO_ENCONTRADA` |
| 409 Conflict | SKU o correo repetido; borrar una categoría o proveedor con productos; quitarse el rol de Administrador; el stock cambió durante una salida | `DUPLICADO`, `CONFLICTO`, `STOCK_CAMBIO` |
| 413 Payload Too Large | El cuerpo supera 100 KB | `PETICION_GRANDE` |
| 422 Unprocessable Entity | Datos que no cumplen las reglas: campo vacío, cantidad 0, stock insuficiente, motivo no permitido, enlace de recuperación vencido | `DATOS_INVALIDOS`, `STOCK_INSUFICIENTE`, `VALIDACION_BD` |
| 429 Too Many Requests | Se superó un límite de uso (ver sección 4) | `DEMASIADAS_PETICIONES` |
| 500 Internal Server Error | Error inesperado (se registra en el servidor; al cliente no se le muestran detalles internos) | `ERROR_INTERNO` |
| 502 Bad Gateway | No se pudo enviar el correo de recuperación | `CORREO_NO_ENVIADO` |
| 503 Service Unavailable | No hay conexión con MongoDB | `BD_NO_DISPONIBLE` |

## 4. Límites y cuotas

Los límites se cuentan por dirección IP. Cada respuesta incluye los encabezados estándar `RateLimit` y `RateLimit-Policy`, que dicen cuántas peticiones quedan y cuándo se reinicia el contador.

| Alcance | Límite | Motivo |
|---|---|---|
| Toda la API (`/api/*`) | 1000 peticiones cada 15 minutos | Evita abusos y protege el plan gratuito |
| `POST /auth/login` | 10 intentos fallidos cada 15 minutos | Frena el adivinar contraseñas |
| `POST /auth/recuperar` | 5 cada hora | Evita enviar correos sin fin |
| `POST /auth/restablecer` | 10 cada hora | Frena el adivinar enlaces |
| Tamaño del cuerpo | 100 KB | Ninguna petición legítima es más grande |
| Paginación | Catálogo: máx. 48 por página · listas internas: máx. 100 | Respuestas rápidas |

Además, por usar planes gratuitos: el servidor en Render se "duerme" tras 15 minutos sin uso y la primera petición puede tardar unos 50 segundos; MongoDB Atlas M0 permite 512 MB de datos; Brevo permite 300 correos al día.

## 5. Consideraciones de seguridad

- **Contraseñas:** se guardan cifradas con bcrypt (10 rondas). Nunca se guardan ni se devuelven en texto plano; la API nunca envía `passwordHash`.
- **Mensajes de login:** el error no dice si falló el correo o la contraseña, y la respuesta tarda lo mismo en ambos casos, para no revelar qué correos existen.
- **Recuperación de contraseña:** el enlace usa un token aleatorio de 256 bits que vence en 30 minutos y sirve una sola vez. En la base se guarda solo su hash SHA-256. La respuesta es la misma exista o no el correo.
- **Autorización:** el rol se revisa en el servidor en cada ruta; ocultar botones en el frontend es solo comodidad. El autor de cada movimiento sale del token, no del cuerpo de la petición (no se puede registrar a nombre de otro).
- **CORS:** solo el frontend autorizado (`FRONTEND_URL`) puede llamar a la API desde un navegador.
- **Encabezados de seguridad:** se usa `helmet` (evita que la página se incruste en otros sitios, desactiva la detección de tipo, etc.).
- **Inyección:** los filtros se arman con objetos, nunca concatenando texto; las búsquedas escapan los caracteres especiales de las expresiones regulares; todos los campos se validan (tipo, largo, formato) antes de llegar a la base.
- **Integridad de datos:** cada colección tiene un validador `$jsonSchema` (el stock no puede ser negativo, la cantidad debe ser mayor que 0, etc.) e índices únicos para SKU, correo y nombre de categoría. Movimiento y stock se guardan en una transacción.
- **Secretos:** la conexión a la base, la clave del JWT y la del correo están en variables de entorno, fuera del código y de GitHub.

## 6. Endpoints

### 6.1 Estado

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/salud` | Público | Comprueba que la API está arriba y conectada a MongoDB |

```json
{ "api": "ok", "baseDeDatos": "conectada", "motor": "MongoDB 8.0.4", "nombreBase": "ferreteria_alpha", "latenciaMs": 12,
  "documentos": { "usuarios": 3, "categorias": 8, "proveedores": 5, "productos": 16, "movimientos": 64 } }
```

### 6.2 Autenticación

| Método | Ruta | Acceso | Requerimiento |
|---|---|---|---|
| POST | `/auth/login` | Público | RF05 |
| GET | `/auth/perfil` | Sesión | RF08 |
| POST | `/auth/recuperar` | Público | RF06 |
| POST | `/auth/restablecer` | Público | RF06 |

**Iniciar sesión**

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "maria.gonzalez@alpha.cl", "password": "Admin123!" }
```

```json
200 OK
{ "token": "eyJhbGciOiJIUzI1NiIs…",
  "usuario": { "_id": "6710a1f0c2e4b81a2c000001", "nombreCompleto": "María González", "email": "maria.gonzalez@alpha.cl", "rol": "Administrador" } }
```

Errores: `401 CREDENCIALES_INVALIDAS`, `403 CUENTA_INACTIVA`, `422` si falta un campo, `429` tras 10 intentos fallidos.

**Recuperar contraseña:** `POST /auth/recuperar` con `{ "email": "…" }` → `200` con un mensaje genérico; se envía un correo con el enlace `https://<frontend>/restablecer?token=…`.
**Restablecer:** `POST /auth/restablecer` con `{ "token": "…", "password": "Nueva1234" }` → `200`. Si el enlace venció: `422` con `detalles.campo = "token"`.

### 6.3 Catálogo público

| Método | Ruta | Acceso | Requerimiento |
|---|---|---|---|
| GET | `/productos` | Público | RF01–RF03 |
| GET | `/productos/:id` | Público | RF04 |
| GET | `/categorias` | Público | RF03 |

**Parámetros de `GET /productos`:** `q` (texto en nombre, SKU, marca, descripción y palabras clave), `categorias` (ids separados por coma), `precioMin`, `precioMax`, `soloStock=true`, `orden` (`nombre_asc`, `nombre_desc`, `precio_asc`, `precio_desc`), `pagina`, `porPagina` (máx. 48).

```json
GET /api/productos?q=martillo&soloStock=true
200 OK
{ "datos": [ { "_id": "6710a1f0c2e4b81a2c000301", "sku": "HER-0016", "nombre": "Martillo carpintero 16 oz",
               "marca": "Forja Andina", "precioVenta": 8990, "imagenUrl": "/img/productos/HER-0016.svg", "unidadMedida": "unidad",
               "categoria": { "_id": "6710a1f0c2e4b81a2c000101", "nombre": "Herramientas manuales" },
               "disponibilidad": "disponible", "descripcion": "Mango de fibra de vidrio y cabeza forjada." } ],
  "total": 1, "pagina": 1, "porPagina": 8, "totalPaginas": 1 }
```

`disponibilidad` vale `disponible`, `ultimas_unidades` o `sin_stock`. El catálogo no muestra el stock exacto ni el mínimo. La ficha (`/productos/:id`) agrega `relacionados`: hasta 3 productos de la misma categoría.

### 6.4 Inventario y movimientos (sesión)

| Método | Ruta | Descripción | Requerimiento |
|---|---|---|---|
| GET | `/inventario` | Tabla del panel; primero sin stock y críticos. Filtros: `q`, `categoria`, `estado` (`sin_stock`, `critico`, `normal`), `pagina` | RF14 |
| GET | `/inventario/resumen` | Productos activos, en alerta y movimientos de hoy | RF14 |
| GET | `/inventario/alertas` | Productos en o bajo su mínimo (consulta C08) | RF14 |
| POST | `/movimientos` | Registra una entrada o salida | RF10–RF12 |
| GET | `/movimientos` | Historial. Filtros: `producto`, `tipo`, `desde`, `hasta`, `pagina` | RF13 |

**Estados del stock:** `sin_stock` si el stock es 0; `critico` si es mayor que 0 y menor o igual al mínimo; `normal` si supera el mínimo.

**Registrar una salida**

```http
POST /api/movimientos
Authorization: Bearer <token>
Content-Type: application/json

{ "idProducto": "6710a1f0c2e4b81a2c000308", "tipoMovimiento": "salida", "cantidad": 2, "motivo": "Venta" }
```

```json
201 Created
{ "movimiento": { "_id": "…", "tipoMovimiento": "salida", "cantidad": 2, "motivo": "Venta", "fechaHora": "2026-10-19T14:42:00.000Z",
                  "stockResultante": 10, "producto": { "_id": "…", "sku": "FIJ-0812", "nombre": "Tornillo volcanita 8×1\" (100 un)" },
                  "usuario": { "_id": "…", "nombreCompleto": "María González" } },
  "stockAnterior": 12, "stockActual": 10, "estadoStock": "critico", "alertaStockMinimo": true }
```

Motivos permitidos — entrada: `Compra a proveedor`, `Devolución de cliente`, `Ajuste de conteo`; salida: `Venta`, `Merma`, `Ajuste de conteo`, `Devolución a proveedor`.
Errores: `422 STOCK_INSUFICIENTE` (con `stockDisponible`), `422` si el producto está descontinuado o el motivo no corresponde, `404` si el producto no existe, `409 STOCK_CAMBIO` si otra persona sacó stock al mismo tiempo.

El servidor consulta el stock en la base, lo valida, y guarda el movimiento y el nuevo stock **en una sola transacción**.

### 6.5 Reportes (sesión)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/reportes` | Lista de reportes con sus parámetros |
| GET | `/reportes/:id` | Ejecuta un reporte. Devuelve las filas, la agregación de MongoDB ejecutada y la consulta SQL equivalente |

Reportes: `valor-por-categoria`, `mas-salidas`, `actividad-usuarios`, `reponer`, `por-proveedor`, `catalogo-filtrado`, `movimientos-por-dia`. Usan `$lookup` (JOIN), `$group` (GROUP BY) y operadores (`$gte`, `$lt`, `$in`, `$expr`, `$cond`, `$multiply`…).

### 6.6 Administración (solo Administrador)

| Método | Ruta | Descripción | Requerimiento |
|---|---|---|---|
| GET | `/productos/admin/lista` | Todos los productos, con stock, mínimo y proveedor. Filtros: `q`, `categoria`, `estado` | RF09 |
| GET | `/productos/admin/:id` | Un producto con todos sus datos | RF09 |
| POST | `/productos` | Crea un producto (parte con stock 0) | RF09 |
| PUT | `/productos/:id` | Edita un producto (el stock solo cambia con movimientos) | RF09 |
| PATCH | `/productos/:id/estado` | `{ "estado": "descontinuado" }` baja lógica, o `"activo"` para reactivar | RF09 |
| POST · PUT · DELETE | `/categorias`, `/categorias/:id` | Crear, renombrar (actualiza sus productos) y eliminar (solo sin productos) | RF15 |
| GET · POST · PUT · DELETE | `/proveedores`, `/proveedores/:id` | Igual que categorías. `GET` también lo puede usar el Empleado | RF15 |
| GET · POST | `/usuarios` | Lista (con cantidad de movimientos) y creación | RF16 |
| PUT | `/usuarios/:id` | Nombre, correo, rol y contraseña | RF16 |
| PATCH | `/usuarios/:id/estado` | `{ "estado": "inactivo" }` desactiva (no se borra) | RF16 |

**Crear producto**

```json
POST /api/productos
{ "sku": "MED-0060", "nombre": "Nivel de burbuja 60 cm", "marca": "Medix", "idCategoria": "6710a1f0c2e4b81a2c000107",
  "idProveedor": "6710a1f0c2e4b81a2c000201", "precioVenta": 7490, "unidadMedida": "unidad", "stockMinimo": 5,
  "ubicacionBodega": "Pasillo 1-C", "palabrasClave": ["nivel", "burbuja"], "imagenUrl": "https://ejemplo.cl/nivel.jpg" }
```

Errores: `409 DUPLICADO` si el SKU existe; `422` con `detalles.campo` si falta un dato o la categoría no existe.

**Reglas de protección:** no se puede borrar una categoría o proveedor que tenga productos (`409`), ni desactivarse a sí mismo, ni dejar el sistema sin Administradores activos (`409`).
