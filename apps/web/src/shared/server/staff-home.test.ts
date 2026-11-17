import { describe, expect, it } from 'vitest';
import { staffHomeFor } from './staff-home';

describe('staffHomeFor', () => {
  it('sends each platform role to its own console', () => {
    expect(staffHomeFor('SYSTEM_ADMIN')).toBe('/sistema');
    expect(staffHomeFor('MODERATOR')).toBe('/moderacion');
  });
  it('keeps members in the person portal', () => {
    expect(staffHomeFor('CLIENTE')).toBeNull();
  });
});
