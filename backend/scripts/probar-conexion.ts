/*
 * Comprueba la conexión a MongoDB y muestra cuántos documentos tiene cada colección.
 *   npm run db:probar
 */
import { cliente, db } from "../src/config/db";
import { env } from "../src/config/env";

async function main() {
  await cliente.connect();
  const info = await db.command({ buildInfo: 1 }).catch(() => ({ version: "?" }));
  console.log(`Conectado a MongoDB ${info["version"]} · base "${env.mongodbDb}"`);

  const colecciones = ["usuarios", "categorias", "proveedores", "productos", "movimientos"];
  for (const nombre of colecciones) {
    console.log(`  ${nombre.padEnd(12)} ${await db.collection(nombre).countDocuments()} documentos`);
  }

  const hola = await db.admin().command({ hello: 1 });
  console.log(hola["setName"] ? `Replica set "${hola["setName"]}": las transacciones funcionan.` : "OJO: no es replica set, las transacciones fallarán.");
}

main()
  .catch((e) => {
    console.error("No se pudo conectar:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => cliente.close());
