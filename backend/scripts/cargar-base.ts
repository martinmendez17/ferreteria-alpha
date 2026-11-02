/*
 * Crea la base de datos desde cero: las 5 colecciones con sus validadores
 * ($jsonSchema), los índices y los datos de prueba.
 * Equivale a ejecutar 01_esquema.sql y 02_datos.sql de la Entrega 1.
 *
 *   npm run db:cargar
 *
 * ¡Ojo! Borra lo que haya en la base indicada en MONGODB_DB.
 */
import bcrypt from "bcryptjs";
import { cliente, col, db } from "../src/config/db";
import { env } from "../src/config/env";
import { indices, validadores } from "../src/config/esquema";
import * as semilla from "../src/datos/semilla";
import type { UsuarioDoc } from "../src/types/modelos";

async function main() {
  await cliente.connect();
  console.log(`Conectado. Base de datos: "${env.mongodbDb}"\n`);

  // 1. Esquema: se borran y se vuelven a crear las colecciones con su validador
  const existentes = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const nombre of Object.keys(validadores)) {
    if (existentes.has(nombre)) await db.collection(nombre).drop();
    await db.createCollection(nombre, { validator: validadores[nombre], validationLevel: "strict", validationAction: "error" });
    for (const { clave, opciones } of indices[nombre] ?? []) {
      await db.collection(nombre).createIndex(clave, opciones);
    }
    console.log(`  colección ${nombre.padEnd(12)} creada con validador y ${(indices[nombre] ?? []).length} índice(s)`);
  }

  // 2. Datos de prueba
  const usuarios: UsuarioDoc[] = await Promise.all(
    semilla.usuarios.map(async ({ password, ...u }) => ({
      ...u,
      passwordHash: await bcrypt.hash(password, 10),
      estado: "activo" as const,
      fechaCreacion: new Date(),
      ultimoAcceso: null,
      recuperacion: null,
    })),
  );
  const productos = semilla.construirProductos();
  const movimientos = semilla.construirMovimientos(productos);

  // Comprobación: el último movimiento de cada producto deja su stock actual
  for (const p of productos) {
    const ultimo = movimientos.filter((m) => m.producto._id.equals(p._id)).at(-1);
    if (ultimo?.stockResultante !== p.inventario.stockActual) {
      throw new Error(`El historial de ${p.sku} no calza con su stock (${ultimo?.stockResultante} ≠ ${p.inventario.stockActual})`);
    }
  }

  await col.usuarios.insertMany(usuarios);
  await col.categorias.insertMany(semilla.categorias);
  await col.proveedores.insertMany(semilla.proveedores);
  await col.productos.insertMany(productos);
  await col.movimientos.insertMany(movimientos);

  console.log("\nDocumentos cargados:");
  for (const nombre of Object.keys(validadores)) {
    console.log(`  ${nombre.padEnd(12)} ${await db.collection(nombre).countDocuments()}`);
  }
  console.log("\nUsuarios de prueba:");
  for (const u of semilla.usuarios) console.log(`  ${u.email.padEnd(26)} ${u.password.padEnd(14)} ${u.rol}`);
}

main()
  .catch((e) => {
    console.error("\nNo se pudo cargar la base:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => cliente.close());
