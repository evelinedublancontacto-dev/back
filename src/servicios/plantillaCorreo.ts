/* ------------------------------------------------------------------ *
 *  src/servicios/plantillaCorreo.ts
 *  Correos HTML con la identidad del sitio: logo, morado y dorado de
 *  src/index.css del front, Poppins/Lato y la frase de Eveline. Todo con
 *  tablas y estilos en línea, que es lo único que respetan Gmail, Outlook
 *  y el correo de iPhone. Cada correo lleva también su versión en texto.
 * ------------------------------------------------------------------ */

import type { ModalidadAtencion } from './agenda';

export const URL_SITIO = 'https://www.evelinedublan.com';
export const URL_LOGO = `${URL_SITIO}/assets/logos/eveline-logo.png`;
export const WHATSAPP = { numero: '+52 771 143 91 16', url: 'https://wa.me/527711439116' };

/** Datos de la cuenta de Eveline. Van en el correo: antes había que pedirlos por WhatsApp.
 *  Se escriben agrupados igual que en la imagen que ella comparte, para que se lean sin errores. */
export const DEPOSITO = {
  banco: 'BBVA',
  titular: 'Eveline Montserrat González Dublán',
  cuenta: '29 68 49 43 98',
  clabe: '01 22 90 02 96 84 94 39 80',
  paypal: 'evelinedublan@gmail.com',
  notaPaypal: 'solo en PayPal, agregar 3% sobre el total',
};

/** Frase de Eveline en la sección "Sobre mí" del sitio. */
export const FRASE_EVELINE = 'Acompaño a los seres sintientes en sus caminos de sanación, tejiendo puentes de claridad, respeto y equilibrio.';
export const LEMA = 'Psicoterapeuta & Terapeuta Holística';

/* Mismos tonos que las variables CSS del front (hsl → hex). */
const C = {
  morado: '#7d34b2',
  moradoProfundo: '#61288a',
  fondoOscuro: '#1f1528',
  /** Turquesa del logo (muestreado de eveline-logo.png). */
  turquesa: '#20b0b8',
  dorado: '#d09d25',
  doradoClaro: '#ecbd51',
  fondo: '#faf9fb',
  texto: '#261736',
  textoSuave: '#73677e',
  borde: '#e0dce5',
  secundario: '#f0ebf4',
  blanco: '#ffffff',
};

const FUENTE_TEXTO = "'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const FUENTE_TITULO = "'Poppins', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export const ETIQUETA_MODALIDAD: Record<ModalidadAtencion, string> = {
  presencial: 'Presencial, en consultorio',
  en_linea: 'En línea (videollamada)',
  a_distancia: 'A distancia, asíncrona (no requiere conectarse)',
};

/** Todo lo que escribe el visitante pasa por aquí antes de entrar al HTML. */
export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export type DetalleCita = {
  nombre: string;
  correo: string;
  telefono: string;
  servicio: string;
  /** Ya en texto largo: "lunes 21 de septiembre". */
  fechaLarga: string;
  /** "10:00" */
  hora: string;
  modalidad?: ModalidadAtencion;
  notas?: string;
  /** Primera cita con Eveline: lleva las indicaciones de depósito y puntualidad. */
  primeraCita?: boolean;
  /** Último día para depositar, ya en texto largo. Solo se usa si primeraCita. */
  limiteDeposito?: string;
};

/** Indicaciones que Eveline manda en la primera cita. `{limite}` se sustituye. */
export const INDICACIONES_PRIMERA_CITA: Array<{ icono: string; texto: string }> = [
  { icono: '💡', texto: 'Te recordamos que esta cita será confirmada con tu depósito, que puedes realizar desde hoy y hasta el {limite}. En caso de no realizarse el depósito en los días indicados, se liberará el horario para otro paciente.' },
  { icono: '‼️', texto: 'No realices el depósito fuera del tiempo estipulado. Aunque lo realices, ya no nos será posible darte el día y horario previamente pactado.' },
  { icono: '📩', texto: `El comprobante tendrá que ser compartido por WhatsApp al ${WHATSAPP.numero} para su registro. En el concepto deberá ir el nombre del paciente.` },
  { icono: '⏰', texto: 'Recuerda estar puntual en tu sesión: solo damos diez minutos de tolerancia. Pasado ese tiempo, la sesión se cancela y debe ser pagada.' },
  { icono: '📜', texto: 'Ingresa a la sesión de Zoom con tu nombre.' },
  { icono: '⚠️', texto: 'Si requieres cambiar el horario o el día, o cancelar (en esta y futuras sesiones), avisa con mínimo 24 horas de anticipación; de lo contrario se cobrará la cita.' },
  { icono: '‼️', texto: 'Las citas SUBSECUENTES agendadas al final de tu sesión ya quedan confirmadas; no nos comunicaremos contigo para confirmarlas. Cada paciente adulto debe hacerse cargo de recordar sus citas y asistir o cancelar con tiempo.' },
  { icono: '✨', texto: 'Cualquier duda, quedo al pendiente.' },
];

/** Indicaciones que Eveline manda cuando la cita es subsecuente: no lleva
 *  depósito ni confirmación, el pago va antes de la sesión. */
export const INDICACIONES_CITA_SUBSECUENTE: Array<{ icono: string; texto: string }> = [
  { icono: '⚠️', texto: 'Al ser una cita subsecuente, esta cita ya está confirmada.' },
  { icono: '💳', texto: 'El pago de tu sesión deberá realizarse antes de la cita; puede ser el mismo día de la sesión.' },
  { icono: '⏰', texto: 'Recuerda estar puntual en tu sesión: solo damos diez minutos de tolerancia. Pasado ese tiempo, la sesión se cancela y debe ser pagada.' },
  { icono: '📜', texto: 'Ingresa a la sesión de Zoom con tu nombre.' },
  { icono: '⚠️', texto: 'Si requieres cambiar el horario o el día, o cancelar (en esta y futuras sesiones), avisa con mínimo 24 horas de anticipación; de lo contrario se cobrará la cita.' },
  { icono: '‼️', texto: 'Las citas SUBSECUENTES agendadas al final de tus sesiones anteriores ya están confirmadas. No nos comunicaremos contigo para confirmarlas. Cada paciente adulto debe hacerse cargo de recordar sus citas y asistir o cancelar con tiempo.' },
  { icono: '✨', texto: 'Cualquier duda, quedo al pendiente.' },
];

function bloqueIndicaciones(cual: string, lineas: Array<{ icono: string; texto: string }>): { html: string; texto: string[] } {
  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-collapse:separate;background:#fff8e6;border:1px solid ${C.doradoClaro};border-radius:10px;">
      <tr><td style="padding:18px 20px 6px;font-family:${FUENTE_TITULO};font-size:16px;font-weight:600;color:${C.texto};">✅ Por favor, lee completo (${escaparHtml(cual)})</td></tr>
      ${lineas
        .map(
          (l) => `<tr><td style="padding:6px 20px;font-family:${FUENTE_TEXTO};font-size:14px;line-height:1.6;color:${C.texto};">${l.icono} ${escaparHtml(l.texto)}</td></tr>`,
        )
        .join('')}
      <tr><td style="padding:6px 20px 16px;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>`;
  return { html, texto: [`✅ Por favor, leer completo (${cual}):`, '', ...lineas.map((l) => `${l.icono} ${l.texto}`)] };
}

/** Tarjeta con la cuenta para depositar; acompaña a las indicaciones. */
function bloqueDeposito(): { html: string; texto: string[] } {
  const filas: Array<[string, string]> = [
    ['Banco', DEPOSITO.banco],
    ['Titular', DEPOSITO.titular],
    ['No. de cuenta', DEPOSITO.cuenta],
    ['CLABE', DEPOSITO.clabe],
    ['PayPal', `${DEPOSITO.paypal} (${DEPOSITO.notaPaypal})`],
  ];
  const pie = `En el concepto debe ir el nombre del paciente. Comparte tu comprobante por WhatsApp al ${WHATSAPP.numero}.`;
  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:separate;background:${C.secundario};border:1px solid ${C.borde};border-radius:10px;">
      <tr><td colspan="2" style="padding:18px 20px 10px;font-family:${FUENTE_TITULO};font-size:16px;font-weight:600;color:${C.texto};">💳 Datos para el depósito</td></tr>
      ${filas
        .map(
          ([etiqueta, valor]) => `<tr>
        <td style="padding:4px 20px;font-family:${FUENTE_TEXTO};font-size:13px;color:${C.textoSuave};text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;vertical-align:top;">${etiqueta}</td>
        <td style="padding:4px 20px 4px 0;font-family:${FUENTE_TEXTO};font-size:14px;line-height:1.5;color:${C.texto};font-weight:600;">${escaparHtml(valor)}</td>
      </tr>`,
        )
        .join('')}
      <tr><td colspan="2" style="padding:12px 20px 16px;font-family:${FUENTE_TEXTO};font-size:13px;line-height:1.6;color:${C.textoSuave};">${escaparHtml(pie)}</td></tr>
    </table>`;
  const texto = ['💳 Datos para el depósito:', '', ...filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`), '', pie];
  return { html, texto };
}

/** El bloque que toca según el tipo de cita; nada si no se sabe cuál es. */
function indicacionesCita(d: DetalleCita): { html: string; texto: string[] } | null {
  if (d.primeraCita === undefined) return null;
  if (!d.primeraCita) return bloqueIndicaciones('cita subsecuente', INDICACIONES_CITA_SUBSECUENTE);
  const limite = d.limiteDeposito ?? 'la fecha indicada por Eveline';
  return bloqueIndicaciones(
    'primera cita',
    INDICACIONES_PRIMERA_CITA.map((i) => ({ icono: i.icono, texto: i.texto.replace('{limite}', limite) })),
  );
}

export type CorreoListo = { asunto: string; texto: string; html: string };

type Fila = { etiqueta: string; valor: string };

function tablaDetalle(filas: Fila[]): string {
  const celdas = filas
    .map(
      (f, i) => `
        <tr>
          <td style="padding:10px 16px;border-top:${i === 0 ? '0' : `1px solid ${C.borde}`};font-family:${FUENTE_TEXTO};font-size:13px;color:${C.textoSuave};text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;vertical-align:top;">${f.etiqueta}</td>
          <td style="padding:10px 16px;border-top:${i === 0 ? '0' : `1px solid ${C.borde}`};font-family:${FUENTE_TEXTO};font-size:16px;color:${C.texto};font-weight:700;vertical-align:top;">${f.valor}</td>
        </tr>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:${C.secundario};border-left:4px solid ${C.dorado};border-radius:10px;">
      ${celdas}
    </table>`;
}

function boton(texto: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="background:${C.morado};border-radius:10px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:${FUENTE_TEXTO};font-size:15px;font-weight:700;color:${C.blanco};text-decoration:none;border-radius:10px;">${texto}</a>
        </td>
      </tr>
    </table>`;
}

/** Marco común: logo, cabecera morada, cuerpo, frase y pie. */
export function envolver(o: { titulo: string; preencabezado: string; cuerpo: string }): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escaparHtml(o.titulo)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Poppins:wght@500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.fondo};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escaparHtml(o.preencabezado)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fondo};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.blanco};border-radius:16px;overflow:hidden;border:1px solid ${C.borde};">
          <tr><td style="height:5px;background:${C.dorado};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td align="center" style="padding:28px 24px 20px;">
              <a href="${URL_SITIO}" style="text-decoration:none;">
                <img src="${URL_LOGO}" width="200" alt="Eveline Dublán" style="display:block;width:200px;max-width:70%;height:auto;border:0;">
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:${C.turquesa};padding:26px 32px;">
              <p style="margin:0 0 8px;font-family:${FUENTE_TEXTO};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:${C.fondoOscuro};">${LEMA}</p>
              <h1 style="margin:0;font-family:${FUENTE_TITULO};font-size:24px;line-height:1.3;font-weight:600;color:${C.blanco};">${escaparHtml(o.titulo)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;font-family:${FUENTE_TEXTO};font-size:16px;line-height:1.65;color:${C.texto};">
              ${o.cuerpo}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
                <td style="width:56px;height:0;border-top:1px solid ${C.dorado};font-size:0;line-height:0;"></td>
                <td style="padding:0 10px;color:${C.dorado};font-size:14px;line-height:1;">✦</td>
                <td style="width:56px;height:0;border-top:1px solid ${C.dorado};font-size:0;line-height:0;"></td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:${C.fondoOscuro};padding:30px 36px;">
              <p style="margin:0 0 16px;font-family:${FUENTE_TITULO};font-size:16px;line-height:1.6;font-style:italic;font-weight:500;color:${C.doradoClaro};">“${FRASE_EVELINE}”</p>
              <p style="margin:0 0 4px;font-family:${FUENTE_TEXTO};font-size:13px;color:${C.blanco};font-weight:700;">Eveline Dublán</p>
              <p style="margin:0;font-family:${FUENTE_TEXTO};font-size:12px;line-height:1.7;color:#b9adc9;">
                Hidalgo, México · <a href="${WHATSAPP.url}" style="color:${C.doradoClaro};text-decoration:none;">WhatsApp ${WHATSAPP.numero}</a><br>
                <a href="${URL_SITIO}" style="color:${C.doradoClaro};text-decoration:none;">www.evelinedublan.com</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:${FUENTE_TEXTO};font-size:12px;color:${C.textoSuave};">Recibes este correo porque se solicitó una cita con estos datos en evelinedublan.com.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function filasCita(d: DetalleCita, conCliente: boolean): Fila[] {
  const filas: Fila[] = [];
  if (conCliente) {
    filas.push({ etiqueta: 'Cliente', valor: escaparHtml(d.nombre) });
    filas.push({ etiqueta: 'Correo', valor: `<a href="mailto:${escaparHtml(d.correo)}" style="color:${C.morado};text-decoration:none;">${escaparHtml(d.correo)}</a>` });
    filas.push({ etiqueta: 'Teléfono', valor: escaparHtml(d.telefono) });
  }
  filas.push({ etiqueta: 'Servicio', valor: escaparHtml(d.servicio) });
  if (d.primeraCita !== undefined) filas.push({ etiqueta: 'Tipo', valor: d.primeraCita ? 'Primera cita' : 'Cita subsecuente' });
  filas.push({ etiqueta: 'Fecha', valor: escaparHtml(d.fechaLarga) });
  filas.push({ etiqueta: 'Hora', valor: `${escaparHtml(d.hora)} <span style="font-weight:400;color:${C.textoSuave};font-size:13px;">hora del centro de México</span>` });
  if (d.modalidad) filas.push({ etiqueta: 'Modalidad', valor: escaparHtml(ETIQUETA_MODALIDAD[d.modalidad]) });
  if (d.notas?.trim()) filas.push({ etiqueta: 'Notas', valor: `<span style="font-weight:400;">${escaparHtml(d.notas.trim())}</span>` });
  return filas;
}

function lineasTexto(d: DetalleCita, conCliente: boolean): string[] {
  return [
    ...(conCliente ? [`Cliente:   ${d.nombre}`, `Correo:    ${d.correo}`, `Teléfono:  ${d.telefono}`] : []),
    `Servicio:  ${d.servicio}`,
    ...(d.primeraCita !== undefined ? [`Tipo:      ${d.primeraCita ? 'Primera cita' : 'Cita subsecuente'}`] : []),
    `Fecha:     ${d.fechaLarga}`,
    `Hora:      ${d.hora} (hora del centro de México)`,
    ...(d.modalidad ? [`Modalidad: ${ETIQUETA_MODALIDAD[d.modalidad]}`] : []),
    ...(d.notas?.trim() ? [`Notas:     ${d.notas.trim()}`] : []),
  ];
}

/** Correo que recibe la persona que agendó. */
export function correoCitaCliente(d: DetalleCita): CorreoListo {
  /* La cita subsecuente no espera confirmación: así la maneja Eveline. */
  const subsecuente = d.primeraCita === false;
  const asunto = subsecuente ? `Tu cita quedó agendada: ${d.servicio}` : `Recibimos tu solicitud: ${d.servicio}`;
  const titulo = subsecuente ? 'Tu cita subsecuente está confirmada' : 'Recibimos tu solicitud de cita';
  const entrada = subsecuente
    ? 'Gracias por confiar en este espacio. Tu cita quedó agendada y estos son los datos:'
    : 'Gracias por confiar en este espacio. Recibimos tu solicitud de cita y estos son los datos:';
  const indicaciones = indicacionesCita(d);
  /* La cuenta solo va en la primera cita: es la que se confirma con depósito.
     La subsecuente se paga antes de la sesión y quien la agenda ya tiene los datos. */
  const deposito = d.primeraCita === true ? bloqueDeposito() : null;
  const cuerpo = `
    <p style="margin:0 0 16px;">Hola <strong>${escaparHtml(d.nombre)}</strong>,</p>
    <p style="margin:0 0 20px;">${entrada}</p>
    ${tablaDetalle(filasCita(d, false))}
    <p style="margin:24px 0 20px;">${
      subsecuente
        ? 'Al ser una cita subsecuente, <strong>ya está confirmada</strong>: no hace falta que esperes respuesta. Si necesitas cambiarla o cancelarla, responde a este correo o escríbele directamente:'
        : 'Tu horario queda apartado y <strong>se confirma con tu depósito</strong>, según las indicaciones de abajo. Si necesitas cambiarla o cancelarla, responde a este correo o escríbele directamente:'
    }</p>
    ${boton('Escribir por WhatsApp', WHATSAPP.url)}
    ${indicaciones ? indicaciones.html : ''}
    ${deposito ? deposito.html : ''}
    <p style="margin:24px 0 0;font-size:14px;color:${C.textoSuave};">Recuerda: solo se puede tener una cita agendada a la vez, y la cita debe agendarla la persona que tomará la sesión.</p>`;
  const texto = [
    `Hola ${d.nombre},`,
    '',
    entrada,
    '',
    ...lineasTexto(d, false),
    '',
    ...(subsecuente
      ? [
          'Al ser una cita subsecuente, ya está confirmada: no hace falta que esperes respuesta.',
          `Si necesitas cambiarla o cancelarla, responde a este correo o escríbele al ${WHATSAPP.numero}.`,
        ]
      : [
          'Tu horario queda apartado y se confirma con tu depósito, según las indicaciones de abajo.',
          `Si necesitas cambiarla o cancelarla, responde a este correo o escríbele al ${WHATSAPP.numero}.`,
        ]),
    ...(indicaciones ? ['', ...indicaciones.texto] : []),
    ...(deposito ? ['', ...deposito.texto] : []),
    '',
    `“${FRASE_EVELINE}”`,
    '— Eveline Dublán · www.evelinedublan.com',
  ].join('\n');
  return { asunto, texto, html: envolver({ titulo, preencabezado: `${d.servicio} · ${d.fechaLarga} a las ${d.hora}`, cuerpo }) };
}

/** Aviso que recibe Eveline con los datos completos. */
export function correoCitaAdmin(d: DetalleCita): CorreoListo {
  const subsecuente = d.primeraCita === false;
  const asunto = `Nueva cita${subsecuente ? ' subsecuente' : ''}: ${d.servicio} · ${d.fechaLarga} ${d.hora}`;
  const aviso = subsecuente
    ? 'Hola Eveline, alguien acaba de agendar una cita <strong>subsecuente</strong> desde el sitio. En su correo ya se le dijo que queda confirmada; en el panel sigue como pendiente hasta que la marques.'
    : 'Hola Eveline, alguien acaba de solicitar una cita desde el sitio. Queda <strong>pendiente</strong> hasta que la confirmes en el panel.';
  const cuerpo = `
    <p style="margin:0 0 20px;">${aviso}</p>
    ${tablaDetalle(filasCita(d, true))}
    <p style="margin:24px 0 20px;">Al responder este correo le escribes directamente a ${escaparHtml(d.nombre)}.</p>
    ${boton('Abrir el panel de citas', `${URL_SITIO}/admin/citas`)}`;
  const texto = [
    aviso.replace(/<[^>]+>/g, ''),
    '',
    ...lineasTexto(d, true),
    '',
    `Panel: ${URL_SITIO}/admin/citas`,
  ].join('\n');
  return { asunto, texto, html: envolver({ titulo: 'Nueva solicitud de cita', preencabezado: `${d.nombre} · ${d.servicio} · ${d.fechaLarga} ${d.hora}`, cuerpo }) };
}
