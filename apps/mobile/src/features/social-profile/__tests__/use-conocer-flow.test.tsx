import type {} from '../../../../../web/node_modules/vitest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiError } from '@gymsheet/api-client';
import { socialProfileConflictMessage } from '@gymsheet/hooks';
import { useConocerFlow } from '../use-conocer-flow';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  photos: vi.fn(),
  notify: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));
vi.mock('expo-router', () => ({ useRouter: () => ({ replace: vi.fn(), back: vi.fn() }) }));
vi.mock('expo-haptics', () => ({ notificationAsync: vi.fn(), NotificationFeedbackType: { Success: 'success' } }));
vi.mock('@/api/services', () => ({ profilePhotosService: { list: mocks.photos } }));
vi.mock('@/api/social-profile-service', () => ({
  socialProfileService: { get: mocks.get, update: mocks.update, finishOnboardingStep: vi.fn() },
}));
vi.mock('@/notifications', () => ({ notify: mocks.notify, resolveError: (error: Error) => ({ message: error.message }) }));
vi.mock('@/state/auth-store', () => ({
  useAuthStore: (select: (state: { principal: { id: string } }) => unknown) => select({ principal: { id: 'u1' } }),
}));

const profile = (version: number, bio: string) => ({
  interests: [], drinking: null, smoking: null, pets: null,
  orientation: null, orientationVisible: false, bio, version,
});

function renderFlow() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useConocerFlow('perfil', 4), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.photos.mockResolvedValue([]);
});

describe('useConocerFlow on a 409', () => {
  it('keeps the draft, refreshes the version, warns, and the next save goes against the fresh version', async () => {
    mocks.get.mockResolvedValueOnce(profile(1, 'vieja')).mockResolvedValue(profile(2, 'del otro dispositivo'));
    mocks.update
      .mockRejectedValueOnce(new ApiError({ message: 'Versión desactualizada.', status: 409, kind: 'conflict' }))
      .mockImplementation(async (input: { bio: string | null }) => profile(3, input.bio ?? ''));
    const { result } = renderFlow();
    await waitFor(() => expect(result.current.draft.bio).toBe('vieja'));

    act(() => result.current.update({ bio: 'mía' }));
    await act(async () => result.current.next());

    await waitFor(() => expect(mocks.notify.warning).toHaveBeenCalledWith(socialProfileConflictMessage));
    expect(result.current.draft.bio).toBe('mía');
    expect(result.current.step).toBe(4);
    expect(mocks.notify.error).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.profile.data?.version).toBe(2));

    await act(async () => result.current.next());
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
    expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ bio: 'mía', expectedVersion: 2 }));
  });
});
