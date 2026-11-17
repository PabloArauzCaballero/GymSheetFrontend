import type {} from '../../../../../web/node_modules/vitest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiError } from '@gymsheet/api-client';
import { emailVerificationCopy } from '@gymsheet/domain';
import { useEmailVerification } from '../use-email-verification';

const { request, setEmailVerified, refreshAccount } = vi.hoisted(() => ({
  request: vi.fn(),
  setEmailVerified: vi.fn(),
  refreshAccount: vi.fn(),
}));

vi.mock('@/api/client', () => ({ apiClient: { request } }));
vi.mock('@/notifications', () => ({ resolveError: () => ({ title: 'Error', message: 'Algo falló.' }) }));
vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));
vi.mock('@/state/auth-store', () => ({
  useAuthStore: (select: (state: object) => unknown) =>
    select({ emailVerified: false, setEmailVerified, refreshAccount }),
}));

const pinError = (status: number, code: string, details?: Record<string, unknown>) =>
  new ApiError({ message: 'x', status, kind: status === 429 ? 'rate-limit' : 'validation', code, details });

function renderFlow() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useEmailVerification(), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  refreshAccount.mockResolvedValue(undefined);
});

test('the sixth digit submits by itself and verification updates the session', async () => {
  request.mockResolvedValue({ verified: true });
  const { result } = renderFlow();
  act(() => result.current.setPin('12 34 56'));
  await waitFor(() => expect(result.current.verified).toBe(true));
  expect(request).toHaveBeenCalledWith('/auth/email/verify/confirm', expect.anything(), { method: 'POST', body: { pin: '123456' } });
  expect(setEmailVerified).toHaveBeenCalledWith(true);
  expect(refreshAccount).toHaveBeenCalled();
});

test('a wrong code keeps the digits and says why, inline', async () => {
  request.mockRejectedValue(pinError(400, 'EMAIL_PIN_INVALID'));
  const { result } = renderFlow();
  act(() => result.current.setPin('111111'));
  await waitFor(() => expect(result.current.error).toBe(emailVerificationCopy.errors.EMAIL_PIN_INVALID));
  expect(result.current.pin).toBe('111111');
  expect(result.current.verified).toBe(false);
});

test('an expired code clears the field so the next one starts clean', async () => {
  request.mockRejectedValue(pinError(400, 'EMAIL_PIN_EXPIRED'));
  const { result } = renderFlow();
  act(() => result.current.setPin('222222'));
  await waitFor(() => expect(result.current.error).toBe(emailVerificationCopy.errors.EMAIL_PIN_EXPIRED));
  expect(result.current.pin).toBe('');
});

test('resending starts the countdown; a 429 sets the server wait', async () => {
  request.mockResolvedValueOnce({ accepted: true });
  const { result } = renderFlow();
  act(() => result.current.resend());
  await waitFor(() => expect(result.current.cooldown).toBe(60));
  expect(result.current.notice).toBe('Te enviamos un código nuevo.');

  request.mockRejectedValueOnce(pinError(429, 'EMAIL_PIN_COOLDOWN', { retryAfterSeconds: 37 }));
  act(() => result.current.resend());
  await waitFor(() => expect(result.current.error).toBe(emailVerificationCopy.errors.EMAIL_PIN_COOLDOWN));
  expect(result.current.cooldown).toBeGreaterThanOrEqual(36);
});
