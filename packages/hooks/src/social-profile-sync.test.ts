import { describe, expect, it, vi } from 'vitest';
import { queryKeys } from './query-keys';
import {
  refreshDiscoveryReadiness,
  socialProfileConflictMessage,
  socialProfileSaveFailure,
} from './social-profile-sync';

describe('refreshDiscoveryReadiness', () => {
  it('invalidates the shared readiness key', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    await refreshDiscoveryReadiness({ invalidateQueries });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.discoveryReadiness });
  });
});

describe('socialProfileSaveFailure', () => {
  it('treats a 409 as a conflict to resolve by saving the kept draft again', () => {
    expect(socialProfileSaveFailure({ status: 409 })).toEqual({ conflict: true, message: socialProfileConflictMessage });
  });

  it('treats anything else as a plain error', () => {
    expect(socialProfileSaveFailure({ status: 400 })).toEqual({ conflict: false });
    expect(socialProfileSaveFailure(new Error('x'))).toEqual({ conflict: false });
    expect(socialProfileSaveFailure(null)).toEqual({ conflict: false });
  });
});
