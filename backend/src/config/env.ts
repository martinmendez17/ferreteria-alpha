import "dotenv/config";

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa el archivo .env (ver .env.example).`);
  }
  return valor;
}

const frontendUrls = (process.env["FRONTEND_URL"] ?? "http://localhost:5173")
  .split(",")
  .map((u) => u.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const env = {
  port: Number(process.env["PORT"] ?? 3000),
  esProduccion: process.env["NODE_ENV"] === "production",

  mongodbUri: requerida("MONGODB_URI"),
  mongodbDb: process.env["MONGODB_DB"] ?? "ferreteria_alpha",

  jwtSecret: requerida("JWT_SECRET"),
  jwtExpiresIn: process.env["JWT_EXPIRES_IN"] ?? "8h",

  /** Orígenes permitidos por CORS. */
  frontendUrls,
  /** Dirección que se usa para armar los enlaces de los correos. */
  frontendUrl: frontendUrls[0] ?? "http://localhost:5173",

  brevoApiKey: process.env["BREVO_API_KEY"] ?? "",
  correoRemitente: process.env["CORREO_REMITENTE"] ?? "",
  nombreRemitente: process.env["NOMBRE_REMITENTE"] ?? "Ferretería Alpha",
};
