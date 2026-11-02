import { app } from "./app";
import { cliente, conectar } from "./config/db";
import { env } from "./config/env";

async function iniciar() {
  // Se prueba la conexión antes de aceptar peticiones
  await conectar();
  console.log(`Conexión a MongoDB: OK (base "${env.mongodbDb}")`);

  const servidor = app.listen(env.port, () => {
    console.log(`API de Ferretería Alpha escuchando en http://localhost:${env.port}`);
  });

  const cerrar = async () => {
    servidor.close();
    await cliente.close();
    process.exit(0);
  };
  process.on("SIGINT", cerrar);
  process.on("SIGTERM", cerrar);
}

iniciar().catch(async (error) => {
  console.error("No se pudo iniciar la API:", error instanceof Error ? error.message : error);
  await cliente.close().catch(() => {});
  process.exit(1);
});
