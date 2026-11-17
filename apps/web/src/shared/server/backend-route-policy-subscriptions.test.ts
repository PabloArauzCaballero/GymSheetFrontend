import { describe, expect, it } from 'vitest';
import { isNoStoreBackendPath, resolveAllowedBackendPath } from './backend-route-policy';

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';

const allowedCases: Array<[string[], string]> = [
  [['me', 'subscriptions'], '/me/subscriptions'],
  [['me', 'subscriptions', id], `/me/subscriptions/${id}`],
  [['business', 'me', 'subscriptions'], '/business/me/subscriptions'],
  [['business', 'me', 'subscriptions', id], `/business/me/subscriptions/${id}`],
  [['business', 'me', 'subscriptions', id, 'cancel'], `/business/me/subscriptions/${id}/cancel`],
  [['business', 'me', 'subscriptions', id, 'suspend'], `/business/me/subscriptions/${id}/suspend`],
  [['business', 'me', 'subscriptions', id, 'reactivate'], `/business/me/subscriptions/${id}/reactivate`],
];

const blockedCases: Array<[string[]]> = [
  [['me', 'subscriptions', 'not-a-uuid']],
  [['me', 'subscriptions', id, 'cancel']],
  [['business', 'me', 'subscriptions', id, 'delete']],
  // Retired with franja 8e (backend ADR-0026): the gym-operated memberships and access control.
  [['me', 'membership']],
  [['me', 'membership', 'activation-request']],
  [['me', 'accesses']],
  [['memberships', 'me']],
  [['membership', 'plans']],
  [['access', 'me']],
  [['admin', 'membership', 'plans']],
  [['admin', 'membership', 'users']],
  [['admin', 'membership', 'insights', 'lapsed']],
  [['admin', 'access', 'devices']],
];

describe('backend route policy for the subscriptions (franja 8e)', () => {
  it.each(allowedCases)('allows a verified route', (parts, expected) => {
    expect(resolveAllowedBackendPath(parts)).toBe(expected);
  });
  it.each(blockedCases)('blocks a retired or unknown route', (parts) => {
    expect(resolveAllowedBackendPath(parts)).toBeNull();
  });
  it('never caches who holds a plan', () => {
    expect(isNoStoreBackendPath('/me/subscriptions')).toBe(true);
    expect(isNoStoreBackendPath(`/business/me/subscriptions/${id}`)).toBe(true);
  });
});
