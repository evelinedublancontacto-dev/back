import { describe, expect, it } from 'bun:test';
import { correoCitaAdmin, correoCitaCliente, escaparHtml, FRASE_EVELINE, URL_LOGO } from '../src/servicios/plantillaCorreo';
import { fechaLarga } from '../src/servicios/fechas';

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

describe('fechaLarga', () => {
  it('escribe la fecha civil en español sin correrla de día', () => {
    expect(fechaLarga('2026-09-21')).toBe('lunes, 21 de septiembre');
    expect(fechaLarga('2026-01-01')).toBe('jueves, 1 de enero');
  });
});
