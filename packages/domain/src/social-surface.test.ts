import { describe, expect, it } from 'vitest';
import { offersSelfieVerification, socialSurfaceOpen } from './index';

describe('socialSurfaceOpen', () => {
  it('closes only for an explicit unverified email', () => {
    expect(socialSurfaceOpen({ emailVerified: false })).toBe(false);
    expect(socialSurfaceOpen({ emailVerified: true })).toBe(true);
    // An older backend that does not report the flag keeps the previous behaviour.
    expect(socialSurfaceOpen({})).toBe(true);
    expect(socialSurfaceOpen(null)).toBe(true);
  });
});

describe('offersSelfieVerification', () => {
  it('asks only verified members', () => {
    expect(offersSelfieVerification({ role: 'CLIENTE', emailVerified: true })).toBe(true);
    expect(offersSelfieVerification({ role: 'CLIENTE', emailVerified: false })).toBe(false);
    expect(offersSelfieVerification({ role: 'ADMIN', emailVerified: true })).toBe(false);
    expect(offersSelfieVerification({ role: 'MODERATOR', emailVerified: true })).toBe(false);
    expect(offersSelfieVerification(null)).toBe(false);
  });
});
