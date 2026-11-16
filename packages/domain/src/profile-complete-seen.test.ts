import { describe, expect, it } from 'vitest';
import { BIO_PLACEHOLDER, completeCardMode, completeSeenAfter, profileCompleteSeenKey } from './profile-complete-seen';

describe('profile complete card, said once', () => {
  it('shows the full card the first time the profile is complete', () => {
    expect(completeCardMode(100, false)).toBe('full');
  });

  it('collapses to the quiet entry once it has been seen', () => {
    expect(completeCardMode(100, true)).toBe('quiet');
  });

  it('waits for the device memory instead of flashing the wrong variant', () => {
    expect(completeCardMode(100, undefined)).toBe('pending');
  });

  it('has no complete card below 100 %, whatever was remembered', () => {
    expect(completeCardMode(88, true)).toBe('none');
    expect(completeCardMode(0, undefined)).toBe('none');
  });

  it('remembers at 100 % and forgets below, so a new completion celebrates again', () => {
    expect(completeSeenAfter(100)).toBe(true);
    expect(completeSeenAfter(75)).toBe(false);
  });

  it('keys the memory per member with SecureStore-safe characters', () => {
    const key = profileCompleteSeenKey('3cb8a3a2-03b1-4bb3-b000-000000000001');
    expect(key).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(key).not.toBe(profileCompleteSeenKey('other'));
  });

  it('the bio placeholder is an instruction, not a bio', () => {
    expect(BIO_PLACEHOLDER.startsWith('Ej.:')).toBe(true);
  });
});
