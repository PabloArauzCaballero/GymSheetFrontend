import { describe, expect, it } from 'vitest';
import { staffHomeFor } from './staff-home';

describe('staffHomeFor', () => {
  it('sends each platform role to its own console', () => {
    expect(staffHomeFor('SYSTEM_ADMIN')).toBe('/sistema');
    expect(staffHomeFor('MODERATOR')).toBe('/moderacion');
  });
  it('keeps members and the legacy gym roles in the person portal (franja 7a)', () => {
    for (const role of ['CLIENTE', 'ADMIN', 'FRONT_DESK', 'COACH', 'ENTRENADOR_EXTERNO'] as const) {
      expect(staffHomeFor(role)).toBeNull();
    }
  });
});
