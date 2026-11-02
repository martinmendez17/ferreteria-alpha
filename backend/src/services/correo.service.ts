import { env } from "../config/env";

/*
 * Envío de correos con la API de Brevo (https://www.brevo.com, plan gratuito).
 * Se usa su API por HTTPS y no SMTP porque los servidores gratuitos de Render
 * bloquean los puertos SMTP.
 * Si no hay BREVO_API_KEY (desarrollo local), el correo se muestra en la consola.
 */

interface Correo {
  para: string;
  nombre: string;
  asunto: string;
  html: string;
  texto: string;
}

export const correoConfigurado = () => Boolean(env.brevoApiKey && env.correoRemitente);

export async function enviarCorreo(c: Correo): Promise<boolean> {
  if (!correoConfigurado()) {
    console.log(`\n[CORREO de prueba] Para: ${c.para}\nAsunto: ${c.asunto}\n${c.texto}\n`);
    return false;
  }

  const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.brevoApiKey, accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      sender: { name: env.nombreRemitente, email: env.correoRemitente },
      to: [{ email: c.para, name: c.nombre }],
      subject: c.asunto,
      htmlContent: c.html,
      textContent: c.texto,
      tags: ["recuperar-contrasena"],
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!respuesta.ok) {
    console.error("[CORREO] Brevo respondió", respuesta.status, await respuesta.text());
    throw new Error("No se pudo enviar el correo");
  }
  return true;
}

export function correoRecuperacion(nombre: string, enlace: string, minutos: number) {
  const texto =
    `Hola ${nombre}:\n\nRecibimos una solicitud para cambiar tu contraseña de Ferretería Alpha.\n` +
    `Abre este enlace para elegir una nueva (vence en ${minutos} minutos):\n${enlace}\n\n` +
    `Si no fuiste tú, ignora este correo: tu contraseña no cambiará.`;
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;color:#1D2733">
    <div style="background:#0F2A44;padding:16px 24px;border-radius:8px 8px 0 0">
      <span style="display:inline-block;background:#E07A1F;color:#fff;font-weight:700;width:28px;height:28px;line-height:28px;text-align:center;border-radius:6px">A</span>
      <span style="color:#fff;font-weight:700;font-size:18px;margin-left:8px">Ferretería Alpha</span>
    </div>
    <div style="border:1px solid #E3E7EC;border-top:0;padding:24px;border-radius:0 0 8px 8px">
      <h2 style="font-size:20px;margin:0 0 12px">Cambiar tu contraseña</h2>
      <p>Hola ${nombre}:</p>
      <p>Recibimos una solicitud para cambiar tu contraseña. El enlace vence en <b>${minutos} minutos</b>.</p>
      <p style="margin:24px 0"><a href="${enlace}" style="background:#1F6F8B;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Elegir nueva contraseña</a></p>
      <p style="color:#5B6774;font-size:13px">Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>
    </div>
  </div>`;
  return { texto, html };
}
