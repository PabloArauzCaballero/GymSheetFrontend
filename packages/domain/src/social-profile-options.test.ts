import { describe, expect, it } from 'vitest';
import { offersConocer } from './social-profile-options';

describe('offersConocer', () => {
  it('is offered to members only', () => {
    expect(offersConocer('CLIENTE')).toBe(true);
    for (const role of ['ADMIN', 'FRONT_DESK', 'SYSTEM_ADMIN', 'COACH', 'ENTRENADOR_EXTERNO', undefined, null]) {
      expect(offersConocer(role)).toBe(false);
    }
  });
});
