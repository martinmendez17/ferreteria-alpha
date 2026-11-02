/*
 * Prueba de punta a punta de la API: recorre los casos de uso y los casos de
 * error, y revisa que cada uno responda con el código HTTP esperado.
 *
 *   npm run dev              (en otra terminal)
 *   npm run test:api
 *
 * Usa los datos de prueba (npm run db:cargar) y agrega algunos registros.
 * Para probar contra la API publicada: API_URL=https://.../api npm run test:api
 */
const API = process.env["API_URL"] ?? "http://localhost:3000/api";

let correctas = 0;
let fallidas = 0;

async function pedir(metodo: string, ruta: string, cuerpo?: unknown, token?: string, crudo?: string) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: {
      ...(cuerpo !== undefined || crudo ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: crudo ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
  });
  const datos = r.status === 204 ? null : await r.json().catch(() => null);
  return { status: r.status, datos };
}

async function caso(nombre: string, esperado: number, p: Promise<{ status: number; datos: any }>, revisar?: (d: any) => string | void) {
  const { status, datos } = await p;
  const problema = status !== esperado ? `respondió ${status}: ${JSON.stringify(datos)?.slice(0, 160)}` : revisar?.(datos);
  if (problema) {
    fallidas++;
    console.log(`  ✗ ${nombre} — esperaba ${esperado}, ${problema}`);
  } else {
    correctas++;
    console.log(`  ✓ ${String(esperado).padEnd(3)} ${nombre}${status >= 400 ? `  → "${datos?.error}"` : ""}`);
  }
  return datos;
}

async function main() {
  console.log(`Probando ${API}\n`);

  console.log("Público");
  await caso("Estado de la API", 200, pedir("GET", "/salud"), (d) => (d.baseDeDatos === "conectada" ? undefined : "sin base"));
  const cat = await caso("Catálogo (8 por página)", 200, pedir("GET", "/productos"), (d) => (d.datos.length === 8 && d.total >= 16 ? undefined : `vino ${d.datos.length}`));
  await caso("Catálogo: búsqueda por marca", 200, pedir("GET", "/productos?q=voltecno"), (d) => (d.total === 2 ? undefined : `total ${d.total}`));
  await caso("Catálogo: búsqueda sin resultados", 200, pedir("GET", "/productos?q=sierra%20caladora"), (d) => (d.total === 0 ? undefined : "debía ser 0"));
  await caso("Catálogo: solo con stock y por precio", 200, pedir("GET", "/productos?soloStock=true&orden=precio_desc"),
    (d) => (d.datos[0].precioVenta >= d.datos[1].precioVenta && d.datos.every((p: any) => p.disponibilidad !== "sin_stock") ? undefined : "orden o stock mal"));
  await caso("Catálogo: precio mínimo mayor que el máximo", 400, pedir("GET", "/productos?precioMin=9000&precioMax=10"));
  await caso("Catálogo: orden inválido", 422, pedir("GET", "/productos?orden=azar"));
  const id = cat.datos[0]._id;
  await caso("Ficha con relacionados", 200, pedir("GET", `/productos/${id}`), (d) => (Array.isArray(d.relacionados) && d.stockMinimo === undefined ? undefined : "forma incorrecta"));
  await caso("Ficha: id mal escrito", 400, pedir("GET", "/productos/abc"));
  await caso("Ficha: producto que no existe", 404, pedir("GET", "/productos/6710a1f0c2e4b81a2c999999"));
  await caso("Categorías con conteo", 200, pedir("GET", "/categorias"), (d) => (d.length >= 7 && "productosActivos" in d[0] ? undefined : "sin conteo"));
  await caso("Ruta inexistente", 404, pedir("GET", "/no-existe"));
  await caso("JSON mal escrito", 400, pedir("POST", "/auth/login", undefined, undefined, '{"email": '));

  console.log("\nSesión");
  await caso("Login con contraseña incorrecta", 401, pedir("POST", "/auth/login", { email: "maria.gonzalez@alpha.cl", password: "otra" }));
  await caso("Login sin contraseña", 422, pedir("POST", "/auth/login", { email: "maria.gonzalez@alpha.cl" }));
  const admin = (await caso("Login Administrador", 200, pedir("POST", "/auth/login", { email: "maria.gonzalez@alpha.cl", password: "Admin123!" }))).token as string;
  const empleado = (await caso("Login Empleado", 200, pedir("POST", "/auth/login", { email: "Juan.Perez@alpha.cl", password: "Vendedor123!" }))).token as string;
  await caso("Perfil con sesión", 200, pedir("GET", "/auth/perfil", undefined, admin));
  await caso("Inventario sin token", 401, pedir("GET", "/inventario"));
  await caso("Inventario con token falso", 401, pedir("GET", "/inventario", undefined, "abc.def.ghi"));
  await caso("Recuperar contraseña (correo existente)", 200, pedir("POST", "/auth/recuperar", { email: "ana.rojas@alpha.cl" }));
  await caso("Recuperar contraseña (correo inexistente: mismo mensaje)", 200, pedir("POST", "/auth/recuperar", { email: "nadie@alpha.cl" }));
  await caso("Recuperar con correo mal escrito", 422, pedir("POST", "/auth/recuperar", { email: "no-es-correo" }));
  await caso("Restablecer con enlace inválido", 422, pedir("POST", "/auth/restablecer", { token: "x".repeat(64), password: "Nueva1234" }));
  await caso("Restablecer con contraseña débil", 422, pedir("POST", "/auth/restablecer", { token: "x".repeat(64), password: "123" }));

  console.log("\nInventario y movimientos");
  const inv = await caso("Inventario: primero los que requieren atención", 200, pedir("GET", "/inventario", undefined, empleado),
    (d) => (d.datos[0].estadoStock === "sin_stock" ? undefined : `primero vino ${d.datos[0].estadoStock}`));
  await caso("Inventario: filtro por estado", 200, pedir("GET", "/inventario?estado=critico", undefined, empleado),
    (d) => (d.datos.every((p: any) => p.estadoStock === "critico") ? undefined : "filtro mal"));
  await caso("Inventario: estado inválido", 422, pedir("GET", "/inventario?estado=raro", undefined, empleado));
  await caso("Resumen del panel", 200, pedir("GET", "/inventario/resumen", undefined, empleado), (d) => (d.productosActivos === 16 ? undefined : JSON.stringify(d)));
  await caso("Alertas (C08)", 200, pedir("GET", "/inventario/alertas", undefined, empleado));
  const tornillo = inv.datos.find((p: any) => p.sku === "FIJ-0812") ?? (await pedir("GET", "/inventario?q=FIJ-0812", undefined, empleado)).datos.datos[0];
  const stock = tornillo.inventario.stockActual;
  await caso("Salida válida", 201, pedir("POST", "/movimientos", { idProducto: tornillo._id, tipoMovimiento: "salida", cantidad: 2, motivo: "Venta" }, empleado),
    (d) => (d.stockActual === stock - 2 && d.movimiento.stockResultante === stock - 2 && d.movimiento.usuario.nombreCompleto === "Juan Pérez" ? undefined : JSON.stringify(d)));
  await caso("Salida mayor que el stock", 422, pedir("POST", "/movimientos", { idProducto: tornillo._id, tipoMovimiento: "salida", cantidad: 500, motivo: "Venta" }, empleado),
    (d) => (d.codigo === "STOCK_INSUFICIENTE" && d.detalles.campo === "cantidad" ? undefined : JSON.stringify(d)));
  await caso("Entrada válida", 201, pedir("POST", "/movimientos", { idProducto: tornillo._id, tipoMovimiento: "entrada", cantidad: 20, motivo: "Compra a proveedor" }, empleado));
  await caso("Motivo que no corresponde", 422, pedir("POST", "/movimientos", { idProducto: tornillo._id, tipoMovimiento: "entrada", cantidad: 1, motivo: "Venta" }, empleado));
  await caso("Cantidad 0", 422, pedir("POST", "/movimientos", { idProducto: tornillo._id, tipoMovimiento: "salida", cantidad: 0, motivo: "Venta" }, empleado));
  await caso("Cantidad con decimales", 422, pedir("POST", "/movimientos", { idProducto: tornillo._id, tipoMovimiento: "salida", cantidad: 1.5, motivo: "Venta" }, empleado));
  await caso("Tipo inválido", 422, pedir("POST", "/movimientos", { idProducto: tornillo._id, tipoMovimiento: "robo", cantidad: 1, motivo: "Venta" }, empleado));
  await caso("Producto inexistente", 404, pedir("POST", "/movimientos", { idProducto: "6710a1f0c2e4b81a2c999999", tipoMovimiento: "entrada", cantidad: 1, motivo: "Ajuste de conteo" }, empleado));
  // Dos salidas al mismo tiempo que juntas superan el stock: solo una debe pasar
  const actual = (await pedir("GET", `/movimientos?producto=${tornillo._id}`, undefined, empleado)).datos.resumen.producto.stockActual;
  const mitadMas = Math.floor(actual / 2) + 1;
  const [a, b] = await Promise.all([
    pedir("POST", "/movimientos", { idProducto: tornillo._id, tipoMovimiento: "salida", cantidad: mitadMas, motivo: "Venta" }, empleado),
    pedir("POST", "/movimientos", { idProducto: tornillo._id, tipoMovimiento: "salida", cantidad: mitadMas, motivo: "Venta" }, admin),
  ]);
  const codigos = [a.status, b.status].sort().join(",");
  if (codigos === "201,409" || codigos === "201,422") { correctas++; console.log(`  ✓ Dos salidas simultáneas: solo una pasa (${codigos})`); }
  else { fallidas++; console.log(`  ✗ Dos salidas simultáneas: ${codigos}`); }
  const h = await caso("Historial de un producto", 200, pedir("GET", `/movimientos?producto=${tornillo._id}`, undefined, empleado),
    (d) => (d.datos[0].stockResultante === d.resumen.producto.stockActual ? undefined : "el último stockResultante no calza con el stock"));
  void h;
  await caso("Historial con fechas al revés", 400, pedir("GET", "/movimientos?desde=2026-10-10&hasta=2026-10-01", undefined, empleado));
  await caso("Historial con fecha mal escrita", 400, pedir("GET", "/movimientos?desde=10-10-2026", undefined, empleado));

  console.log("\nReportes");
  const lista = await caso("Lista de reportes", 200, pedir("GET", "/reportes", undefined, empleado), (d) => (d.length === 7 ? undefined : `vinieron ${d.length}`));
  for (const r of lista) {
    await caso(`Reporte "${r.id}"`, 200, pedir("GET", `/reportes/${r.id}?desde=2026-01-01`, undefined, empleado),
      (d) => (d.filas.length > 0 && d.consultaMongo.startsWith("db.") && d.consultaSql.includes("SELECT") ? undefined : `filas ${d.filas.length}`));
  }
  await caso("Reporte que no existe", 404, pedir("GET", "/reportes/inventado", undefined, empleado));
  await caso("Reporte con límite fuera de rango", 400, pedir("GET", "/reportes/mas-salidas?limite=999", undefined, empleado));

  console.log("\nPermisos");
  await caso("Empleado crea producto", 403, pedir("POST", "/productos", { sku: "X-001" }, empleado));
  await caso("Empleado lista usuarios", 403, pedir("GET", "/usuarios", undefined, empleado));
  await caso("Empleado puede ver proveedores", 200, pedir("GET", "/proveedores", undefined, empleado));

  console.log("\nAdministración");
  const cats = (await pedir("GET", "/categorias")).datos;
  const plomeria = cats.find((c: any) => c.nombre === "Plomería");
  const sku = `PRU-${Date.now().toString().slice(-6)}`;
  const nuevo = await caso("Crear producto", 201, pedir("POST", "/productos", {
    sku, nombre: "Producto de prueba", marca: "Prueba", idCategoria: plomeria._id, precioVenta: 1990, unidadMedida: "unidad", stockMinimo: 3,
    palabrasClave: "prueba, test", imagenUrl: "https://ejemplo.cl/imagen.jpg",
  }, admin), (d) => (d.inventario.stockActual === 0 && d.categoria.nombre === "Plomería" && d.palabrasClave.length === 2 ? undefined : JSON.stringify(d)));
  await caso("SKU repetido", 409, pedir("POST", "/productos", { sku, nombre: "Otro", idCategoria: plomeria._id, precioVenta: 1, unidadMedida: "unidad" }, admin));
  await caso("SKU con espacios", 422, pedir("POST", "/productos", { sku: "MAL SKU", nombre: "Otro", idCategoria: plomeria._id, precioVenta: 1, unidadMedida: "unidad" }, admin));
  await caso("Producto sin nombre", 422, pedir("POST", "/productos", { sku: "OK-1", idCategoria: plomeria._id, precioVenta: 1, unidadMedida: "unidad" }, admin),
    (d) => (d.detalles?.campo === "nombre" ? undefined : JSON.stringify(d)));
  await caso("Imagen con enlace inválido", 422, pedir("PUT", `/productos/${nuevo._id}`, { imagenUrl: "javascript:alert(1)" }, admin));
  await caso("Categoría inexistente", 422, pedir("PUT", `/productos/${nuevo._id}`, { idCategoria: "6710a1f0c2e4b81a2c999999" }, admin));
  await caso("Editar producto (quitar proveedor)", 200, pedir("PUT", `/productos/${nuevo._id}`, { precioVenta: 2490, idProveedor: null }, admin),
    (d) => (d.precioVenta === 2490 && d.proveedor === null ? undefined : JSON.stringify(d)));
  await caso("Dar de baja", 200, pedir("PATCH", `/productos/${nuevo._id}/estado`, { estado: "descontinuado" }, admin));
  await caso("Ficha pública de producto dado de baja", 404, pedir("GET", `/productos/${nuevo._id}`));
  await caso("Movimiento a producto dado de baja", 422, pedir("POST", "/movimientos", { idProducto: nuevo._id, tipoMovimiento: "entrada", cantidad: 1, motivo: "Ajuste de conteo" }, admin));
  await caso("Lista de administración", 200, pedir("GET", "/productos/admin/lista?estado=descontinuado", undefined, admin),
    (d) => (d.datos.some((p: any) => p._id === nuevo._id) ? undefined : "no aparece"));

  await caso("Borrar categoría con productos", 409, pedir("DELETE", `/categorias/${plomeria._id}`, undefined, admin));
  await caso("Crear categoría repetida (sin importar mayúsculas)", 409, pedir("POST", "/categorias", { nombre: "plomería" }, admin));
  const nuevaCat = await caso("Crear categoría", 201, pedir("POST", "/categorias", { nombre: `Prueba ${sku}` }, admin));
  await caso("Renombrar categoría", 200, pedir("PUT", `/categorias/${nuevaCat._id}`, { nombre: `Prueba renombrada ${sku}` }, admin));
  await caso("Borrar categoría vacía", 204, pedir("DELETE", `/categorias/${nuevaCat._id}`, undefined, admin));
  await caso("Borrar categoría ya borrada", 404, pedir("DELETE", `/categorias/${nuevaCat._id}`, undefined, admin));

  const provs = (await pedir("GET", "/proveedores", undefined, admin)).datos;
  const andes = provs.find((p: any) => p.razonSocial.startsWith("Distribuidora Andes"));
  await caso("Borrar proveedor con productos", 409, pedir("DELETE", `/proveedores/${andes._id}`, undefined, admin));
  await caso("Proveedor con correo inválido", 422, pedir("POST", "/proveedores", { razonSocial: "X", email: "malo" }, admin));
  const prov = await caso("Crear proveedor", 201, pedir("POST", "/proveedores", { razonSocial: `Proveedor ${sku}`, telefono: "+56 9 1234 5678" }, admin));
  await caso("Borrar proveedor sin productos", 204, pedir("DELETE", `/proveedores/${prov._id}`, undefined, admin));

  const usuarios = await caso("Lista de usuarios (sin contraseñas)", 200, pedir("GET", "/usuarios", undefined, admin),
    (d) => (d.every((u: any) => !("passwordHash" in u)) && "movimientos" in d[0] ? undefined : "expone datos"));
  const maria = usuarios.find((u: any) => u.email === "maria.gonzalez@alpha.cl");
  await caso("Desactivarse a sí mismo", 409, pedir("PATCH", `/usuarios/${maria._id}/estado`, { estado: "inactivo" }, admin));
  await caso("Quitarse el rol de Administrador", 409, pedir("PUT", `/usuarios/${maria._id}`, { rol: "Empleado" }, admin));
  await caso("Usuario con contraseña débil", 422, pedir("POST", "/usuarios", { nombreCompleto: "X", email: "x@alpha.cl", password: "abc", rol: "Empleado" }, admin));
  await caso("Usuario con correo repetido", 409, pedir("POST", "/usuarios", { nombreCompleto: "X", email: "ana.rojas@alpha.cl", password: "Prueba123", rol: "Empleado" }, admin));
  const correo = `prueba.${sku.toLowerCase()}@alpha.cl`;
  const u = await caso("Crear usuario", 201, pedir("POST", "/usuarios", { nombreCompleto: "Usuario Prueba", email: correo, password: "Prueba123", rol: "Empleado" }, admin));
  const tokenU = (await pedir("POST", "/auth/login", { email: correo, password: "Prueba123" })).datos.token;
  await caso("Desactivar usuario", 200, pedir("PATCH", `/usuarios/${u._id}/estado`, { estado: "inactivo" }, admin));
  await caso("Su sesión abierta deja de servir", 401, pedir("GET", "/inventario", undefined, tokenU));
  await caso("Ya no puede iniciar sesión", 403, pedir("POST", "/auth/login", { email: correo, password: "Prueba123" }));

  console.log(`\n${correctas} correctas · ${fallidas} fallidas`);
  process.exitCode = fallidas ? 1 : 0;
}

main().catch((e) => {
  console.error("No se pudo terminar la prueba:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
