import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { socialProfileConflictMessage } from '@/shared/api/query-keys';
import { orientationConsentMissing, useSocialProfileDraft } from './use-social-profile-draft';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  notify: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
  consents: vi.fn(),
  setConsent: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('@/features/privacy/services/privacy-service', () => ({
  privacyService: { consents: mocks.consents, setConsent: mocks.setConsent },
}));
vi.mock('../services/social-profile-service', () => ({
  socialProfileKeys: { profile: ['social', 'profile', 'me'], readiness: ['social', 'discovery-readiness'] },
  socialProfileService: { get: mocks.get, update: mocks.update },
}));
vi.mock('@/shared/notifications', () => ({ notify: mocks.notify, confirm: mocks.confirm }));

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

describe('useSocialProfileDraft with an orientation', () => {
  const orientationConsent = (granted: boolean) => ({
    kind: 'ORIENTATION',
    granted,
    version: granted ? '2026-12-02' : null,
    currentVersion: '2026-12-02',
    upToDate: granted,
    grantedAt: null,
    revokedAt: null,
  });

  it('asks for the ORIENTATION consent inline and records it before saving', async () => {
    mocks.get.mockResolvedValue(profile(1, ''));
    mocks.consents.mockResolvedValue([orientationConsent(false)]);
    mocks.setConsent.mockResolvedValue(orientationConsent(true));
    mocks.update.mockImplementation(async () => ({ ...profile(2, ''), orientation: 'BISEXUAL' }));
    const { result } = renderDraft();
    await waitFor(() => expect(result.current.draft).not.toBeNull());

    act(() => result.current.setDraft({ ...result.current.draft!, orientation: 'BISEXUAL' }));
    await waitFor(() => expect(result.current.orientationConsent.needed).toBe(true));

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.saveDraft();
    });
    expect(saved).toBe(false);
    expect(mocks.notify.warning).toHaveBeenCalledWith(orientationConsentMissing);
    expect(mocks.update).not.toHaveBeenCalled();

    act(() => result.current.orientationConsent.onChange(true));
    await act(async () => {
      saved = await result.current.saveDraft();
    });
    expect(saved).toBe(true);
    expect(mocks.setConsent).toHaveBeenCalledWith('ORIENTATION', { granted: true, version: '2026-12-02' });
    expect(mocks.setConsent.mock.invocationCallOrder[0]!).toBeLessThan(mocks.update.mock.invocationCallOrder[0]!);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
});
