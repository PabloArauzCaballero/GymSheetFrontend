import { describe, expect, it } from 'vitest';
import { staffHomeFor } from './staff-home';

describe('staffHomeFor', () => {
  it('sends each non-training role to its own console', () => {
    expect(staffHomeFor('SYSTEM_ADMIN')).toBe('/sistema');
    expect(staffHomeFor('MODERATOR')).toBe('/moderacion');
    expect(staffHomeFor('ADMIN')).toBe('/admin/operacion');
    expect(staffHomeFor('FRONT_DESK')).toBe('/admin/operacion');
  });
  it('keeps members and coaches in the member app', () => {
    expect(staffHomeFor('CLIENTE')).toBeNull();
    expect(staffHomeFor('COACH')).toBeNull();
  });
});
