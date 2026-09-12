import { describe, expect, it } from 'bun:test';
import { mismaPersona, normalizarNombre, normalizarTelefono } from '../src/modulos/citas/servicio';

const ANA = { nombre: 'Ana María López', correo: 'ana@ejemplo.test', telefono: '+52 771 143 91 16' };

describe('mismaPersona', () => {
  it('reconoce el mismo correo aunque cambie mayúsculas o espacios', () => {
    expect(mismaPersona(ANA, { nombre: 'Otra', correo: '  ANA@Ejemplo.test ', telefono: '000' })).toBe(true);
  });
  it('reconoce el mismo teléfono con otro formato o sin lada', () => {
    expect(mismaPersona(ANA, { nombre: 'Otra', correo: 'x@y.test', telefono: '7711439116' })).toBe(true);
    expect(mismaPersona(ANA, { nombre: 'Otra', correo: 'x@y.test', telefono: '(771) 143-9116' })).toBe(true);
  });
  it('reconoce el mismo nombre sin acentos ni mayúsculas', () => {
    expect(mismaPersona(ANA, { nombre: 'ana maria  lopez', correo: 'x@y.test', telefono: '5512345678' })).toBe(true);
  });
  it('no confunde a personas distintas', () => {
    expect(mismaPersona(ANA, { nombre: 'Ana López', correo: 'x@y.test', telefono: '5512345678' })).toBe(false);
  });
  it('un teléfono demasiado corto no cuenta como coincidencia', () => {
    expect(normalizarTelefono('123')).toBe('');
    expect(mismaPersona({ ...ANA, telefono: '123' }, { nombre: 'Otra', correo: 'x@y.test', telefono: '123' })).toBe(false);
  });
  it('normaliza nombres', () => {
    expect(normalizarNombre('  JOSÉ  Ángel-Pérez ')).toBe('jose angel perez');
  });
});
