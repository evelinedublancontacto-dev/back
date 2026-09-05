import { describe, expect, it } from 'bun:test';
import { crearApp } from '../src/app';

describe('GET /salud', () => {
  it('responde estado ok y reporta la base de datos', async () => {
    const res = await crearApp().handle(new Request('http://localhost/salud'));
    expect(res.status).toBe(200);

    const cuerpo = (await res.json()) as { estado: string; bd: string; version: string };
    expect(cuerpo.estado).toBe('ok');
    expect(['ok', 'sin_conexion']).toContain(cuerpo.bd);
    expect(cuerpo.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('responde 404 en JSON para rutas inexistentes', async () => {
    const res = await crearApp().handle(new Request('http://localhost/no-existe'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'No encontrado', codigo: 'no_encontrado' });
  });
});
