import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { socialProfileConflictMessage } from '@/shared/api/query-keys';
import { useSocialProfileDraft } from './use-social-profile-draft';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  notify: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));
vi.mock('../services/social-profile-service', () => ({
  socialProfileKeys: { profile: ['social', 'profile', 'me'], readiness: ['social', 'discovery-readiness'] },
  socialProfileService: { get: mocks.get, update: mocks.update },
}));
vi.mock('@/shared/notifications', () => ({ notify: mocks.notify }));

const profile = (version: number, bio: string) => ({
  interests: [],
  drinking: null,
  smoking: null,
  pets: null,
  orientation: null,
  orientationVisible: false,
  bio,
  version,
});

function renderDraft() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSocialProfileDraft(), { wrapper });
}

afterEach(() => vi.clearAllMocks());

describe('useSocialProfileDraft on a 409', () => {
  it('keeps the draft, re-reads the version, warns, and saves again against the fresh version', async () => {
    mocks.get.mockResolvedValueOnce(profile(1, 'vieja')).mockResolvedValue(profile(2, 'del otro dispositivo'));
    mocks.update
      .mockRejectedValueOnce(new ApiError({ message: 'Versión desactualizada.', status: 409, kind: 'conflict' }))
      .mockImplementation(async (input: { bio: string | null; expectedVersion: number }) => profile(3, input.bio ?? ''));
    const { result } = renderDraft();
    await waitFor(() => expect(result.current.draft?.bio).toBe('vieja'));

    act(() => result.current.setDraft({ ...result.current.draft!, bio: 'mía' }));
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.saveDraft();
    });

    expect(saved).toBe(false);
    expect(result.current.draft?.bio).toBe('mía');
    expect(mocks.notify.warning).toHaveBeenCalledWith(socialProfileConflictMessage);
    expect(mocks.notify.error).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.query.data?.version).toBe(2));

    await act(async () => {
      saved = await result.current.saveDraft();
    });
    expect(saved).toBe(true);
    expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ bio: 'mía', expectedVersion: 2 }));
  });
});
