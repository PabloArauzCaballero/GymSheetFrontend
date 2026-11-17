import { describe, expect, it } from 'vitest';
import { selfieProxySrc } from './verification-service';

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';

describe('selfieProxySrc', () => {
  it('routes the signed link through the BFF, keeping the signature', () => {
    expect(selfieProxySrc(`/api/v1/admin/verifications/${id}/selfie?expires=1&signature=abc_DEF-123`)).toBe(
      `/api/backend/admin/verifications/${id}/selfie?expires=1&signature=abc_DEF-123`,
    );
  });

  it('refuses anything that is not a selfie link', () => {
    expect(selfieProxySrc('https://evil.example/x.jpg')).toBeNull();
    expect(selfieProxySrc(`/api/v1/admin/verifications/${id}/decide`)).toBeNull();
    expect(selfieProxySrc(`/api/v1/admin/verifications/${id}/selfie?x="><script>`)).toBeNull();
  });
});
