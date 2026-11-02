import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { col } from "../config/db";
import { env } from "../config/env";
import { datosInvalidos, HttpError } from "../utils/httpError";
import { correoConfigurado, correoRecuperacion, enviarCorreo } from "./correo.service";

const HASH_FALSO = bcrypt.hashSync("usuario-que-no-existe", 10);

/** RF05: valida credenciales y entrega un token con el rol del usuario. */
export async function iniciarSesion(email: string, password: string) {
  // Consulta C06 traducida a MongoDB: el rol viene embebido, no hace falta un JOIN
  const usuario = await col.usuarios.findOne({ email: email.toLowerCase() });

  // Mismo mensaje en todos los casos para no revelar qué correos existen
  const credencialesInvalidas = new HttpError(401, "Correo o contraseña incorrectos", "CREDENCIALES_INVALIDAS");
  if (!usuario) {
    await bcrypt.compare(password, HASH_FALSO); // tarda lo mismo que con un correo real
    throw credencialesInvalidas;
  }
  const coincide = await bcrypt.compare(password, usuario.passwordHash);
  if (!coincide) throw credencialesInvalidas;
  if (usuario.estado !== "activo") {
    throw new HttpError(403, "Tu cuenta está desactivada. Habla con el Administrador", "CUENTA_INACTIVA");
  }

  await col.usuarios.updateOne({ _id: usuario._id }, { $set: { ultimoAcceso: new Date() } }); // C12

  const token = jwt.sign({ nombre: usuario.nombreCompleto, rol: usuario.rol }, env.jwtSecret, {
    subject: usuario._id.toHexString(),
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });

  return {
    token,
    usuario: { _id: usuario._id, nombreCompleto: usuario.nombreCompleto, email: usuario.email, rol: usuario.rol },
  };
}

const MINUTOS_VIGENCIA = 30;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Recuperar contraseña, paso 1: genera un enlace de un solo uso y lo envía al correo.
 * La respuesta es siempre la misma, exista o no el correo, para no revelar cuentas.
 */
export async function solicitarRecuperacion(email: string) {
  const usuario = await col.usuarios.findOne({ email, estado: "activo" });
  const respuesta: { mensaje: string; enlaceDePrueba?: string } = {
    mensaje: "Si el correo está registrado, te enviamos un enlace para cambiar la contraseña. Revisa tu bandeja de entrada y la carpeta de spam.",
  };
  if (!usuario) return respuesta;

  const token = randomBytes(32).toString("hex");
  await col.usuarios.updateOne(
    { _id: usuario._id },
    { $set: { recuperacion: { tokenHash: hashToken(token), expira: new Date(Date.now() + MINUTOS_VIGENCIA * 60_000) } } },
  );

  const enlace = `${env.frontendUrl}/restablecer?token=${token}`;
  const { html, texto } = correoRecuperacion(usuario.nombreCompleto, enlace, MINUTOS_VIGENCIA);
  try {
    await enviarCorreo({ para: usuario.email, nombre: usuario.nombreCompleto, asunto: "Cambia tu contraseña · Ferretería Alpha", html, texto });
  } catch {
    throw new HttpError(502, "No pudimos enviar el correo en este momento. Intenta de nuevo en unos minutos", "CORREO_NO_ENVIADO");
  }

  // Solo en desarrollo y sin servicio de correo: se devuelve el enlace para poder probar
  if (!correoConfigurado() && !env.esProduccion) respuesta.enlaceDePrueba = enlace;
  return respuesta;
}

/** Recuperar contraseña, paso 2: valida el token y guarda la nueva contraseña. */
export async function restablecerContrasena(token: string, nuevaPassword: string) {
  const usuario = await col.usuarios.findOne({
    "recuperacion.tokenHash": hashToken(token),
    "recuperacion.expira": { $gt: new Date() },
    estado: "activo",
  });
  if (!usuario) {
    throw datosInvalidos("El enlace no es válido o ya venció. Pide uno nuevo desde “¿Olvidaste tu contraseña?”", { campo: "token" });
  }
  const passwordHash = await bcrypt.hash(nuevaPassword, 10);
  // El enlace se borra al usarlo: sirve una sola vez
  await col.usuarios.updateOne({ _id: usuario._id }, { $set: { passwordHash, recuperacion: null } });
  return { mensaje: "Tu contraseña se cambió. Ya puedes iniciar sesión" };
}
