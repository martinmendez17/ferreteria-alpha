# Ferretería Alpha

Proyecto 1 · Entrega 2 · ICI-324 Bases de Datos y Programación Web · Universidad de Valparaíso
Equipo: Martín Méndez, Lucas Cárdenas y Diego Ortega

Aplicación web con tres módulos que comparten una base de datos **MongoDB**:

1. **Catálogo público:** buscar, filtrar y ver la ficha de los productos sin iniciar sesión.
2. **Acceso del personal:** inicio de sesión con dos roles (Administrador y Empleado) y recuperación de contraseña por correo.
3. **Inventario interno:** entradas y salidas de stock, historial, alertas de stock mínimo, reportes y administración de productos, categorías, proveedores y usuarios.

| Parte | Tecnología |
|---|---|
| Frontend | React 19 + Vite, React Router 7, Bootstrap 5 (carpeta `frontend/`) |
| Backend | Node.js 22+ + Express 5 con TypeScript (carpeta `backend/`) |
| Base de datos | MongoDB 8 (MongoDB Atlas, plan gratuito M0) con el driver oficial |
| Seguridad | bcrypt, JWT, límites de uso, helmet, validadores `$jsonSchema` |
| Correo | Brevo (recuperación de contraseña) |

## Estructura

```
ferreteria-alpha/
├── backend/
│   ├── scripts/
│   │   ├── cargar-base.ts       Crea las 5 colecciones (validadores + índices) y carga los datos de prueba
│   │   ├── consultas.ts         Las 13 consultas de la Entrega 1 traducidas a MongoDB
│   │   └── probar-conexion.ts   Muestra la versión de MongoDB y cuántos documentos hay
│   ├── src/
│   │   ├── config/              Variables de entorno, conexión y esquema de la base
│   │   ├── routes/              Todas las rutas de la API
│   │   ├── middlewares/         Sesión (JWT), roles, límites de uso y manejo de errores
│   │   ├── controllers/         Leen y validan la petición; responden con su código HTTP
│   │   ├── services/            Reglas de negocio y consultas a MongoDB (transacciones, $lookup, $group)
│   │   ├── datos/semilla.ts     Datos de prueba
│   │   └── utils/               Validaciones, fechas en hora de Chile, estado del stock
│   └── requests.http            20 peticiones de prueba, incluidas las que deben fallar
├── frontend/
│   ├── public/img/productos/    Imágenes de los productos de prueba
│   └── src/
│       ├── api/                 Cliente de la API y tipos de datos
│       ├── contexto/            Sesión y avisos
│       ├── disenos/             Plantillas de la zona pública e interna
│       ├── componentes/         Ventanas, formularios y piezas reutilizables
│       └── paginas/             Una pantalla por archivo (publico/ e interno/)
├── mongodb/
│   ├── consultas.mongodb.js     Las 13 consultas para pegar en mongosh o Compass
│   └── ejemplos/                Un documento JSON de ejemplo por colección
├── docs/API.md                  Documentación de la API REST
└── render.yaml                  Configuración para publicar la API en Render
```

## Cómo ejecutarlo en tu computador (Windows)

### 1. Programas

- **Node.js 22 o 24 LTS** — https://nodejs.org
- **VS Code** (recomendado, con la extensión *REST Client* para `requests.http`)
- **Git** — https://git-scm.com

### 2. Base de datos en MongoDB Atlas (gratis, no hay que instalar nada)

1. Crea una cuenta en https://www.mongodb.com/cloud/atlas y un clúster **M0 (Free)**.
2. En *Database Access*, crea un usuario con contraseña (anótala).
3. En *Network Access*, agrega `0.0.0.0/0` (permitir desde cualquier lugar; lo necesita Render).
4. En *Connect › Drivers*, copia la dirección `mongodb+srv://…`.

> Se usa Atlas porque las transacciones (movimiento + stock juntos) necesitan un *replica set*, y Atlas ya lo trae, incluso en el plan gratuito.

### 3. Backend

```bash
cd backend
copy .env.example .env        # en Mac/Linux: cp .env.example .env
```

Abre `backend/.env` y completa `MONGODB_URI` (con tu usuario y contraseña de Atlas) y un `JWT_SECRET` largo inventado. Luego:

```bash
npm install
npm run db:cargar      # crea las colecciones y carga los datos de prueba
npm run dev            # API en http://localhost:3000
```

Abre http://localhost:3000/api/salud: debe decir `"baseDeDatos": "conectada"`.

### 4. Frontend (en otra terminal)

```bash
cd frontend
npm install
npm run dev            # página en http://localhost:5173
```

Si la API no está en `http://localhost:3000/api`, crea `frontend/.env.local` con `VITE_API_URL=<dirección>/api`.

### Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| maria.gonzalez@alpha.cl | Admin123! | Administrador |
| juan.perez@alpha.cl | Vendedor123! | Empleado |
| ana.rojas@alpha.cl | Vendedor123! | Empleado |

## Comandos del backend

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia la API y la reinicia al guardar cambios |
| `npm start` | Inicia la API (se usa en Render) |
| `npm run db:cargar` | Borra y vuelve a crear la base con los datos de prueba |
| `npm run db:probar` | Prueba la conexión y cuenta los documentos |
| `npm run db:consultas` | Ejecuta las 13 consultas en orden y muestra sus resultados |
| `npm run db:consultas -- --exportar` | Regenera `mongodb/consultas.mongodb.js` |
| `npm run typecheck` | Revisa los tipos de TypeScript |

## Recuperación de contraseña por correo

Sin configurar nada, en tu computador el enlace se muestra en la consola del backend y también en la pantalla (modo de prueba). Para que llegue un correo de verdad:

1. Crea una cuenta gratis en https://www.brevo.com.
2. En *Senders, Domains & Dedicated IPs › Senders*, agrega y verifica tu correo (ej. tu Gmail).
3. En *SMTP & API › API Keys*, crea una clave.
4. En `backend/.env` completa `BREVO_API_KEY` y `CORREO_REMITENTE` (el correo verificado).

Los correos de prueba (`@alpha.cl`) no existen: para probarlo, crea un usuario con tu correo real desde *Usuarios y roles*.

## Solución de problemas

- **`querySrv ENOTFOUND` o `Server selection timed out`:** revisa `MONGODB_URI` y que en Atlas *Network Access* esté tu IP o `0.0.0.0/0`.
- **`bad auth : authentication failed`:** el usuario o la contraseña de Atlas en `MONGODB_URI` están mal. Si la contraseña tiene símbolos como `@` o `#`, cámbiala por una sin símbolos.
- **`Transaction numbers are only allowed on a replica set`:** estás usando un MongoDB local sin replica set; usa Atlas.
- **`npm : No se puede cargar el archivo npm.ps1`:** ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` en PowerShell.
- **La página muestra "No se pudo conectar con el servidor":** el backend no está corriendo o `VITE_API_URL` apunta a otra dirección.
- **No subas el archivo `.env`** ni lo compartas: tiene las claves. Ya está en `.gitignore`.
