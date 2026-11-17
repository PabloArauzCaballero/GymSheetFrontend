import { describe, expect, it } from 'vitest';
import { isNoStoreBackendPath, resolveAllowedBackendPath } from './backend-route-policy';

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';

const allowedCases: Array<[string[], string]> = [
  [['me', 'affiliations'], '/me/affiliations'],
  [['me', 'affiliations', id], `/me/affiliations/${id}`],
  [['me', 'affiliations', id, 'cancel'], `/me/affiliations/${id}/cancel`],
  [['me', 'affiliations', id, 'end'], `/me/affiliations/${id}/end`],
  [['me', 'gym'], '/me/gym'],
  [['me', 'gym', 'visibility'], '/me/gym/visibility'],
  [['me', 'gym', 'members'], '/me/gym/members'],
  [['business', 'me', 'gym-links'], '/business/me/gym-links'],
  [['business', 'me', 'gym-links', id, 'cancel'], `/business/me/gym-links/${id}/cancel`],
  [['business', 'me', 'affiliations', 'requests'], '/business/me/affiliations/requests'],
  [['business', 'me', 'affiliations', 'members'], '/business/me/affiliations/members'],
  [['business', 'me', 'affiliations', 'coaches'], '/business/me/affiliations/coaches'],
  [['business', 'me', 'affiliations', id, 'confirm'], `/business/me/affiliations/${id}/confirm`],
  [['business', 'me', 'affiliations', id, 'reject'], `/business/me/affiliations/${id}/reject`],
  [['business', 'me', 'affiliations', id, 'end'], `/business/me/affiliations/${id}/end`],
];

const blockedCases: Array<[string[]]> = [
  // A gym is never addressed by the client, ids are UUIDs and the verbs are exact.
  [['me', 'gym', id, 'members']],
  [['me', 'affiliations', 'not-a-uuid']],
  [['me', 'affiliations', id, 'confirm']],
  [['business', 'me', 'affiliations', id, 'cancel']],
  [['business', 'me', 'gym-links', id, 'confirm']],
];

describe('backend route policy for the affiliations (franjas 7b–7c)', () => {
  it.each(allowedCases)('allows a verified route', (parts, expected) => {
    expect(resolveAllowedBackendPath(parts)).toBe(expected);
  });
  it.each(blockedCases)('blocks an unknown route', (parts) => {
    expect(resolveAllowedBackendPath(parts)).toBeNull();
  });
  it('never caches the CI digits or where a person trains', () => {
    expect(isNoStoreBackendPath('/me/affiliations')).toBe(true);
    expect(isNoStoreBackendPath('/me/gym/members')).toBe(true);
    expect(isNoStoreBackendPath('/business/me/affiliations/requests')).toBe(true);
    expect(isNoStoreBackendPath('/me/gym-directory')).toBe(false);
  });
});
