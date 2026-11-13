import { describe, expect, it } from 'vitest';
import { needsDiscoveryPreferences } from './discovery-preferences';

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
