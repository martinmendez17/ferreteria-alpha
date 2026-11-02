import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

async function iniciar() {
  // Se prueba la conexión antes de aceptar peticiones
  await prisma.$queryRaw`SELECT 1`;
  console.log("Conexión a PostgreSQL: OK");

  const servidor = app.listen(env.port, () => {
    console.log(`API de Ferretería Alpha escuchando en http://localhost:${env.port}`);
  });

  const cerrar = async () => {
    servidor.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", cerrar);
  process.on("SIGTERM", cerrar);
}

iniciar().catch(async (error) => {
  console.error("No se pudo iniciar la API:", error);
  await prisma.$disconnect();
  process.exit(1);
});
