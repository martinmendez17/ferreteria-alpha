import "dotenv/config";

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa el archivo .env (ver .env.example).`);
  }
  return valor;
}

export const env = {
  port: Number(process.env["PORT"] ?? 3000),
  databaseUrl: requerida("DATABASE_URL"),
  jwtSecret: requerida("JWT_SECRET"),
  jwtExpiresIn: process.env["JWT_EXPIRES_IN"] ?? "8h",
  frontendUrl: process.env["FRONTEND_URL"] ?? "http://localhost:5173",
};
