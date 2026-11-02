import { rateLimit } from "express-rate-limit";

/*
 * Límites de uso (cuotas) por dirección IP. Si se superan, la API responde
 * 429 y los encabezados RateLimit-* indican cuándo se puede volver a intentar.
 */

const respuesta = (mensaje: string) => ({ error: mensaje, codigo: "DEMASIADAS_PETICIONES" });

/** Toda la API: 1000 peticiones cada 15 minutos (una sala de clases comparte la misma IP). */
export const limiteGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: respuesta("Hiciste demasiadas peticiones. Espera unos minutos e intenta de nuevo"),
});

/** Inicio de sesión: 10 intentos cada 15 minutos (frena el adivinar contraseñas). */
export const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: respuesta("Demasiados intentos de inicio de sesión. Espera 15 minutos"),
});

/** Recuperación de contraseña: 5 solicitudes por hora (evita enviar correos sin fin). */
export const limiteRecuperacion = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: respuesta("Ya pediste varios enlaces de recuperación. Espera una hora"),
});

/** Cambiar la contraseña con el enlace: 10 intentos por hora (contador aparte del anterior). */
export const limiteRestablecer = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: respuesta("Demasiados intentos de cambiar la contraseña. Espera una hora"),
});
