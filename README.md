# Ferretería Alpha — Base de datos y API REST

Proyecto 1, Entrega 1 · ICI-324 Bases de Datos y Programación Web.
Stack C: PostgreSQL 18 · Node.js 24 LTS · Express 5 · Prisma ORM 7 (TypeScript).

## Qué contiene

```
ferreteria-alpha/
├── database/
│   ├── 01_esquema.sql      Crea las 7 tablas con PK, FK, UNIQUE, CHECK e índices
│   ├── 02_datos.sql        Datos de prueba (usuarios, 16 productos, 64 movimientos)
│   ├── 03_consultas.sql    Las 13 consultas del proyecto
│   └── CONSULTAS.md        Qué requerimiento responde cada consulta + álgebra relacional
└── backend/
    ├── prisma/schema.prisma   El modelo de datos para Prisma (mapeado a las tablas SQL)
    ├── prisma.config.ts       Conexión de Prisma 7 (lee DATABASE_URL)
    ├── scripts/probar-conexion.ts
    ├── requests.http          Peticiones de prueba listas para usar
    └── src/
        ├── server.ts          Arranca la API (verifica la conexión a la BD antes)
        ├── app.ts             Configura Express, CORS, JSON y rutas
        ├── config/            Variables de entorno y cliente de Prisma
        ├── routes/            Endpoints por recurso (qué URL y qué middlewares)
        ├── middlewares/       Autenticación JWT, control de rol y manejo de errores
        ├── controllers/       Leen la petición, validan y responden con su código HTTP
        ├── services/          Reglas de negocio y acceso a datos (Prisma)
        └── utils/             Validaciones, errores HTTP y cálculo del estado de stock
```

## 1. Requisitos

- **Node.js 24 LTS** — https://nodejs.org
- **PostgreSQL 18** instalado localmente (incluye pgAdmin), **o** una base gratuita en **Neon** (https://neon.tech).

## 2. Crear la base de datos

**Con psql (terminal):**

```bash
createdb ferreteria_alpha
psql -d ferreteria_alpha -f database/01_esquema.sql
psql -d ferreteria_alpha -f database/02_datos.sql
```

**Con pgAdmin:** crea la base `ferreteria_alpha`, abre *Query Tool*, carga `01_esquema.sql` y ejecútalo (F5); luego haz lo mismo con `02_datos.sql`.

**Con Neon:** crea un proyecto, abre el *SQL Editor* y pega el contenido de `01_esquema.sql` y luego el de `02_datos.sql`.

Usuarios de prueba:

| Correo | Contraseña | Rol |
|---|---|---|
| maria.gonzalez@alpha.cl | Admin123! | Administrador |
| juan.perez@alpha.cl | Vendedor123! | Empleado |
| ana.rojas@alpha.cl | Vendedor123! | Empleado |

## 3. Levantar la API

```bash
cd backend
cp .env.example .env          # en Windows: copy .env.example .env
# edita .env: DATABASE_URL con tu usuario y clave de PostgreSQL, y un JWT_SECRET propio
npm install
# npm 11 o superior no ejecuta los scripts de instalación hasta aprobarlos.
# Si npm install avisa "install-scripts", aprueba estos tres y vuelve a instalar:
npm install-scripts approve prisma @prisma/engines esbuild
npm install
npx prisma generate           # genera el cliente de Prisma en backend/generated/
npm run db:probar             # muestra la versión de PostgreSQL y cuántas filas tiene cada tabla
npm run dev                   # API en http://localhost:3000
```

Abre http://localhost:3000/api/salud: debe responder `"baseDeDatos": "conectada"`.

> No ejecutes `prisma migrate` ni `prisma db pull`: las tablas las crea `01_esquema.sql` (con los CHECK que
> Prisma no puede declarar) y `schema.prisma` ya está escrito para esas tablas.

## 4. Endpoints

| Método | Ruta | Acceso | Requerimiento |
|---|---|---|---|
| GET | /api/salud | Público | Conexión a la BD |
| GET | /api/productos?q=&categoria=&precioMin=&precioMax=&soloStock=true&pagina= | Público | RF01–RF03 |
| GET | /api/productos/:id | Público | RF04 |
| GET | /api/categorias | Público | RF03 |
| POST | /api/auth/login | Público | RF05 |
| GET | /api/auth/perfil | Sesión | RF08 |
| GET | /api/inventario?q=&estado=critico | Sesión | RF14 |
| GET | /api/inventario/resumen | Sesión | RF14 |
| GET | /api/inventario/alertas | Sesión | RF14 (consulta C08) |
| POST | /api/movimientos | Sesión | RF10–RF12 |
| GET | /api/movimientos?producto=&limite= | Sesión | RF13 |
| POST · PUT · PATCH /:id/baja | /api/productos | Administrador | RF09 |
| POST · DELETE | /api/categorias | Administrador | RF15 |
| GET · POST · DELETE | /api/proveedores | Sesión / Administrador | RF15 |
| GET · POST · PATCH /:id/estado | /api/usuarios | Administrador | RF16 |

Las rutas con sesión requieren el encabezado `Authorization: Bearer <token>` (el token lo entrega el login).
El archivo `backend/requests.http` tiene 17 peticiones de ejemplo, incluidas las que deben fallar (401, 409, 422).
Se usan con la extensión *REST Client* de VS Code; también sirven como guía para Postman o Thunder Client.

Ejemplo con curl:

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" \
     -d '{"email":"maria.gonzalez@alpha.cl","password":"Admin123!"}'
```

## 5. Las 13 consultas

> Ejecútalas sobre una base recién cargada (`01_esquema.sql` y luego `02_datos.sql`) y en el orden del archivo:
> algunas dependen de las anteriores, y si se ejecutan dos veces fallan a propósito (SKU repetido, columna que ya existe).

```bash
psql -d ferreteria_alpha -f database/03_consultas.sql
```

`database/CONSULTAS.md` explica cada una y trae los SELECT en álgebra relacional.
Las consultas modifican datos (insertan, borran, alteran tablas); para volver al estado inicial,
ejecuta otra vez `01_esquema.sql` y `02_datos.sql`.

## 6. Guion sugerido para la presentación

| Ítem de la rúbrica | Qué mostrar |
|---|---|
| Construcción de Backend | La carpeta `backend/src`: una petición entra por `routes`, pasa por `middlewares`, la atiende un `controller` y la lógica vive en `services`. |
| Conexión a Base de Datos | `npm run db:probar` y luego `GET /api/salud` en el navegador. |
| Consultas (mínimo 10) | Ejecutar `03_consultas.sql` en pgAdmin, consulta por consulta. |
| Modelo relacional ↔ consultas | `CONSULTAS.md`: cada consulta con su requerimiento; mostrar que `/api/inventario/alertas` ejecuta la misma C08. |
| Integridad | El borrado de “Plomería” falla (FK) y el stock negativo falla (CHECK); en la API, la salida de 500 unidades responde 422. |

## Solución de problemas

- **Windows: `npm : No se puede cargar el archivo ... npm.ps1 porque la ejecución de scripts está deshabilitada`**:
  ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` en PowerShell, o usa la terminal *Command Prompt* de VS Code.
- **`npm install` muestra avisos de `install-scripts` y luego `prisma generate` falla**: ejecuta
  `npm install-scripts approve prisma @prisma/engines esbuild` y otra vez `npm install`.
- **`npm error ENOENT ... package.json`**: la terminal no está en la carpeta `backend`; ejecuta `cd backend`.

- **`Falta la variable de entorno DATABASE_URL`**: no existe `backend/.env` o está vacío.
- **`password authentication failed`**: el usuario o la clave de `DATABASE_URL` no son los de tu PostgreSQL.
  Revisa que la clave reemplace a la palabra `postgres` que va antes de `@` (no que quede pegada a ella) y guarda el archivo.
- **`Cannot find module '../../generated/prisma/client'`**: falta ejecutar `npx prisma generate`.
- **`relation "producto" does not exist`**: la base está vacía; ejecuta `01_esquema.sql` y `02_datos.sql`.
