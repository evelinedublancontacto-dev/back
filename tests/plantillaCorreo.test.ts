import { describe, expect, it } from 'bun:test';
import { correoCitaAdmin, correoCitaCliente, escaparHtml, FRASE_EVELINE, URL_LOGO } from '../src/servicios/plantillaCorreo';
import { fechaLarga, fechaLimiteDeposito, sumarDias } from '../src/servicios/fechas';

const DETALLE = {
  nombre: 'Ana <b>López</b>',
  correo: 'ana@ejemplo.test',
  telefono: '771 143 91 16',
  servicio: 'Sesión de Psicoterapia',
  fechaLarga: fechaLarga('2026-09-21'),
  hora: '10:00',
  modalidad: 'en_linea' as const,
  notas: 'Tema: ansiedad <script>alert(1)</script>',
};

describe('plantilla de correo', () => {
  it('lleva logo, frase de Eveline y los datos de la cita', () => {
    const { html, texto, asunto } = correoCitaCliente(DETALLE);
    expect(asunto).toBe('Recibimos tu solicitud: Sesión de Psicoterapia');
    expect(html).toContain(URL_LOGO);
    expect(html).toContain(FRASE_EVELINE);
    expect(html).toContain('lunes, 21 de septiembre');
    expect(html).toContain('En línea (videollamada)');
    expect(texto).toContain('Hora:      10:00');
    expect(texto).not.toContain('<table'); // el texto plano no lleva marcado
  });

  it('escapa lo que escribe el visitante', () => {
    const { html } = correoCitaCliente(DETALLE);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Ana &lt;b&gt;López&lt;/b&gt;');
    expect(escaparHtml(`a"b'c&`)).toBe('a&quot;b&#39;c&amp;');
  });

  it('el aviso a Eveline incluye contacto y enlace al panel', () => {
    const { html, texto } = correoCitaAdmin(DETALLE);
    expect(html).toContain('mailto:ana@ejemplo.test');
    expect(html).toContain('771 143 91 16');
    expect(html).toContain('/admin/citas');
    expect(texto).toContain('Correo:    ana@ejemplo.test');
  });
});

describe('primera cita', () => {
  it('incluye las indicaciones y la fecha límite del depósito solo si es la primera', () => {
    const primera = correoCitaCliente({ ...DETALLE, primeraCita: true, limiteDeposito: 'sábado, 19 de septiembre' });
    expect(primera.html).toContain('Por favor, lee completo');
    expect(primera.html).toContain('hasta el sábado, 19 de septiembre');
    expect(primera.html).toContain('diez minutos de tolerancia');
    expect(primera.html).toContain('Primera cita');
    expect(primera.texto).toContain('✅ Por favor, leer completo');
    const subsecuente = correoCitaCliente({ ...DETALLE, primeraCita: false });
    expect(subsecuente.html).not.toContain('Por favor, lee completo');
    expect(subsecuente.html).toContain('Cita subsecuente');
  });
});

describe('fechaLimiteDeposito', () => {
  it('es N días antes de la cita, pero nunca antes de hoy', () => {
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(fechaLimiteDeposito('2026-09-21', '2026-09-11', 2)).toBe('2026-09-19');
    expect(fechaLimiteDeposito('2026-09-12', '2026-09-11', 2)).toBe('2026-09-11');
  });
});

describe('fechaLarga', () => {
  it('escribe la fecha civil en español sin correrla de día', () => {
    expect(fechaLarga('2026-09-21')).toBe('lunes, 21 de septiembre');
    expect(fechaLarga('2026-01-01')).toBe('jueves, 1 de enero');
  });
});
