import { describe, expect, it } from 'vitest';
import { localInviteTime } from './local-invite-time';

describe('localInviteTime', () => {
  it('returns a local datetime with an explicit offset', () => {
    const value = '2030-06-02T14:30';
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = localInviteTime(value, zone);
    expect(result).toMatch(/^2030-06-02T14:30:00[+-]\d{2}:\d{2}$/u);
    expect(new Date(result).getTime()).toBe(new Date(value).getTime());
  });

  it('rejects a nonexistent local calendar time', () => {
    expect(() => localInviteTime('not-a-time', 'UTC')).toThrow('fecha y hora válidas');
  });
});
