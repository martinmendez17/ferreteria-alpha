import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { HttpError } from "../utils/httpError";

/** RF05: valida credenciales y entrega un token con el rol del usuario. */
export async function iniciarSesion(email: string, password: string) {
  // Equivale a la consulta C06 de database/03_consultas.sql
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase() },
    include: { rol: true },
  });

  // Mismo mensaje en todos los casos para no revelar qué correos existen
  const credencialesInvalidas = new HttpError(401, "Correo o contraseña incorrectos");
  if (!usuario || usuario.estado !== "activo") throw credencialesInvalidas;
  const coincide = await bcrypt.compare(password, usuario.passwordHash);
  if (!coincide) throw credencialesInvalidas;

  const token = jwt.sign(
    { nombre: usuario.nombreCompleto, rol: usuario.rol.nombreRol },
    env.jwtSecret,
    { subject: String(usuario.idUsuario), expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] },
  );

  return {
    token,
    usuario: {
      idUsuario: usuario.idUsuario,
      nombreCompleto: usuario.nombreCompleto,
      email: usuario.email,
      rol: usuario.rol.nombreRol,
    },
  };
}
