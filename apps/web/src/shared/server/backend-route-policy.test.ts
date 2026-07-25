import { describe, expect, it } from 'vitest';
import { resolveAllowedBackendPath } from './backend-route-policy';

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const allowedCases: Array<[string[], string]> = [
  [['exercises'], '/exercises'],
  [['workouts', id, 'finish'], `/workouts/${id}/finish`],
  [
    ['admin', 'facilities', 'maintenance', id, 'complete'],
    `/admin/facilities/maintenance/${id}/complete`,
  ],
  [['notifications', 'preferences', 'me'], '/notifications/preferences/me'],
];
const blockedCases: Array<[string[]]> = [
  [['admin', 'access', 'mock', 'events']],
  [['admin', 'unknown']],
  [['..', 'secrets']],
  [['gateway', 'events']],
];

describe('backend route policy', () => {
  it.each(allowedCases)('allows a verified route', (parts, expected) => {
    expect(resolveAllowedBackendPath(parts)).toBe(expected);
  });

  it.each(blockedCases)('blocks an unapproved route', (parts) => {
    expect(resolveAllowedBackendPath(parts)).toBeNull();
  });
});
