import { t } from 'elysia';

export const cuerpoNuevaCita = t.Object({
  nombre: t.String({ minLength: 2, maxLength: 160 }),
  email: t.String({ format: 'email', maxLength: 254 }),
  telefono: t.String({ minLength: 7, maxLength: 40 }),
  servicio: t.String({ minLength: 1, maxLength: 80 }),
  fecha: t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  hora: t.String({ pattern: '^\\d{2}:\\d{2}$' }),
  notas: t.Optional(t.String({ maxLength: 2000 })),
  /** Campo trampa: invisible para personas. Si llega lleno, es un bot. */
  sitioWeb: t.Optional(t.String()),
});

export type CuerpoNuevaCita = typeof cuerpoNuevaCita.static;
