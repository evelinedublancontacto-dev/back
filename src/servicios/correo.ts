/* ------------------------------------------------------------------ *
 *  src/servicios/correo.ts
 *  Envío por la API HTTP de Resend, sin SDK. Si no hay clave configurada
 *  se registra en consola y se devuelve false: una reserva nunca debe
 *  fallar porque el correo no salió.
 * ------------------------------------------------------------------ */

import { config } from '../config';

export type Correo = {
  para: string;
  asunto: string;
  /** Versión en texto plano; siempre va, aunque haya html. */
  texto: string;
  html?: string;
  responderA?: string;
};

export async function enviarCorreo(c: Correo): Promise<boolean> {
  if (!config.RESEND_API_KEY || !config.CORREO_REMITENTE) {
    console.info(`[correo] sin configurar; no se envió "${c.asunto}" a ${c.para}`);
    return false;
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.CORREO_REMITENTE,
        to: [c.para],
        subject: c.asunto,
        text: c.texto,
        ...(c.html ? { html: c.html } : {}),
        ...(c.responderA ? { reply_to: c.responderA } : {}),
      }),
    });
    if (!r.ok) {
      console.error('[correo] Resend respondió', r.status, await r.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[correo] no se pudo contactar a Resend:', error);
    return false;
  }
}
