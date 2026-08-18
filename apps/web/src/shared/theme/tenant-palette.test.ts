import { describe, expect, it } from 'vitest';
import { defaultTheme } from './default-palette';
import { normalizeHost, parseRegistry, resolveTheme } from './tenant-palette';

const registryJson = JSON.stringify({
  'lifthouse.gymsheet.app': {
    id: 'lifthouse',
    name: 'LiftHouse',
    dark: { accent: '#ff5a1f', accentInk: '#ff5a1f' },
    light: { accent: '#ff5a1f', accentInk: '#9a3412' },
  },
});

describe('registro de inquilinos', () => {
  it('sin configuración el registro queda vacío', () => {
    expect(parseRegistry(undefined)).toEqual({});
    expect(parseRegistry('   ')).toEqual({});
  });

  it('una identidad parcial hereda el resto del sistema', () => {
    const palette = parseRegistry(registryJson)['lifthouse.gymsheet.app'];
    expect(palette?.id).toBe('lifthouse');
    expect(palette?.dark.accent).toBe('#ff5a1f');
    // Lo no declarado se mantiene: la marca cambia, el sistema visual no.
    expect(palette?.dark.background).toBe(defaultTheme.dark.background);
    expect(palette?.dark.surfaceLowest).toBe(defaultTheme.dark.surfaceLowest);
    expect(palette?.light.accentInk).toBe('#9a3412');
  });

  it('no muta la paleta de referencia', () => {
    parseRegistry(registryJson);
    expect(defaultTheme.dark.accent).toBe('#c3f400');
  });

  // Servir la marca equivocada es peor que fallar de forma visible.
  it('detiene el arranque ante configuración inválida', () => {
    expect(() => parseRegistry('{no es json')).toThrow(/JSON válido/u);
    expect(() =>
      parseRegistry('{"a":{"id":"x","name":"X","dark":{"inventado":"#fff"}}}'),
    ).toThrow(/contrato de tema/u);
    expect(() =>
      parseRegistry('{"a":{"id":"x","name":"X","dark":{"noiseOpacity":"mucho"}}}'),
    ).toThrow(/contrato de tema/u);
  });

  it('empareja el host ignorando puerto y mayúsculas', () => {
    expect(normalizeHost('Gym.Local:3002')).toBe('gym.local');
    expect(normalizeHost(null)).toBe('');
  });

  it('resuelve por host y recae en la identidad de referencia', () => {
    const registry = parseRegistry(registryJson);
    expect(resolveTheme('LiftHouse.GymSheet.app:443', registry).id).toBe('lifthouse');
    expect(resolveTheme('otra.gymsheet.app', registry).id).toBe(defaultTheme.id);
    expect(resolveTheme(null, registry).id).toBe(defaultTheme.id);
  });
});
