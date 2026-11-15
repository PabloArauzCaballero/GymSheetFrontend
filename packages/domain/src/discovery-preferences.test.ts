import { describe, expect, it } from 'vitest';
import { discoveryPreferencesBlocker, needsDiscoveryPreferences } from './discovery-preferences';

describe('needsDiscoveryPreferences', () => {
  it('reconoce el código estable', () => {
    expect(needsDiscoveryPreferences({ status: 400, code: 'DISCOVERY_PREFERENCES_REQUIRED', message: 'x' })).toBe(true);
  });
  it('acepta el texto de backends sin código', () => {
    expect(
      needsDiscoveryPreferences({ status: 400, message: 'Configura tus preferencias de Conocer antes de recibir recomendaciones.' }),
    ).toBe(true);
  });
  it('no confunde otros errores', () => {
    expect(needsDiscoveryPreferences({ status: 500, message: 'preferencias de conocer' })).toBe(false);
    expect(needsDiscoveryPreferences({ status: 400, message: 'Datos no válidos' })).toBe(false);
    expect(needsDiscoveryPreferences(null)).toBe(false);
  });
});

describe('discoveryPreferencesBlocker', () => {
  const ok = { genders: ['MALE'], intents: ['TRAIN'], minAge: 18, maxAge: 65, radiusKm: 25 };
  it('never names one action: the same card saves or deals the deck', () => {
    for (const input of [{ ...ok, genders: [] }, { ...ok, intents: [] }, { ...ok, minAge: 10 }, { ...ok, radiusKm: 0 }]) {
      expect(discoveryPreferencesBlocker(input)).not.toMatch(/guardar|buscar/i);
    }
  });
  it('lets a complete form save', () => {
    expect(discoveryPreferencesBlocker(ok)).toBeNull();
  });
  it('names the first missing choice', () => {
    expect(discoveryPreferencesBlocker({ ...ok, genders: [], intents: [] })).toBe('Elige a quién quieres conocer.');
    expect(discoveryPreferencesBlocker({ ...ok, intents: [] })).toBe('Elige qué buscas.');
  });
  it('rejects impossible ranges, including NaN from an empty input', () => {
    expect(discoveryPreferencesBlocker({ ...ok, minAge: 17 })).toMatch(/edades/);
    expect(discoveryPreferencesBlocker({ ...ok, maxAge: 20, minAge: 30 })).toMatch(/edades/);
    expect(discoveryPreferencesBlocker({ ...ok, radiusKm: Number.NaN })).toBe('El radio va de 1 a 500 km.');
    expect(discoveryPreferencesBlocker({ ...ok, radiusKm: 501 })).toBe('El radio va de 1 a 500 km.');
  });
});
