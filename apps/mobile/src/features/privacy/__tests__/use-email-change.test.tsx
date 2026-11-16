import type {} from '../../../../../web/node_modules/vitest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiError } from '@gymsheet/api-client';
import { emailChangeCopy } from '@gymsheet/domain';
import { useEmailChange } from '../use-email-change';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  back: vi.fn(),
  setEmailVerified: vi.fn(),
  refreshAccount: vi.fn(),
  notify: { success: vi.fn() },
}));

vi.mock('@/api/client', () => ({ apiClient: { request: mocks.request } }));
vi.mock('@/notifications', () => ({ notify: mocks.notify }));
vi.mock('expo-router', () => ({ useRouter: () => ({ back: mocks.back }) }));
vi.mock('expo-haptics', () => ({ notificationAsync: vi.fn(), NotificationFeedbackType: { Success: 'success' } }));
vi.mock('@/state/auth-store', () => ({
  useAuthStore: (select: (state: object) => unknown) =>
    select({ setEmailVerified: mocks.setEmailVerified, refreshAccount: mocks.refreshAccount }),
}));

function renderFlow() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useEmailChange(), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.refreshAccount.mockResolvedValue(undefined);
});

test('password, then the PIN to the new address; the session takes the new email', async () => {
  mocks.request.mockImplementation(async (path: string) =>
    path === '/me/email/change' ? { accepted: true } : { email: 'nuevo@repp.app', emailVerified: true });
  const { result } = renderFlow();
  act(() => {
    result.current.setNewEmail('  Nuevo@Repp.app ');
    result.current.setPassword('secreta');
  });
  await act(async () => result.current.send());
  await waitFor(() => expect(result.current.step).toBe('confirm'));
  expect(mocks.request).toHaveBeenCalledWith('/me/email/change', expect.anything(), {
    method: 'POST',
    body: { newEmail: 'nuevo@repp.app', password: 'secreta' },
  });

  act(() => result.current.setPin('123 456'));
  await waitFor(() => expect(mocks.back).toHaveBeenCalled());
  expect(mocks.request).toHaveBeenCalledWith('/me/email/change/confirm', expect.anything(), { method: 'POST', body: { pin: '123456' } });
  expect(mocks.setEmailVerified).toHaveBeenCalledWith(true);
  expect(mocks.refreshAccount).toHaveBeenCalled();
  expect(mocks.notify.success).toHaveBeenCalledWith(emailChangeCopy.changed('nuevo@repp.app'));
});

test('409 by an active sanction is a banner and the step does not move', async () => {
  mocks.request.mockRejectedValue(new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'EMAIL_CHANGE_BLOCKED_BY_SANCTION' }));
  const { result } = renderFlow();
  act(() => {
    result.current.setNewEmail('nuevo@repp.app');
    result.current.setPassword('secreta');
  });
  await act(async () => result.current.send());
  await waitFor(() => expect(result.current.failure).toEqual({ field: null, message: emailChangeCopy.errors.EMAIL_CHANGE_BLOCKED_BY_SANCTION }));
  expect(result.current.step).toBe('request');
});

test('a wrong password points at its field; a bad email never reaches the server', async () => {
  mocks.request.mockRejectedValue(new ApiError({ message: 'x', status: 400, kind: 'validation', code: 'CURRENT_PASSWORD_INVALID' }));
  const { result } = renderFlow();
  act(() => result.current.setNewEmail('no-es-correo'));
  act(() => result.current.setPassword('secreta'));
  await act(async () => result.current.send());
  expect(result.current.failure?.field).toBe('email');
  expect(mocks.request).not.toHaveBeenCalled();

  act(() => result.current.setNewEmail('nuevo@repp.app'));
  await act(async () => result.current.send());
  await waitFor(() => expect(result.current.failure?.field).toBe('password'));
});

test('a wrong PIN clears the digits and says why under the code', async () => {
  mocks.request.mockImplementation(async (path: string) => {
    if (path === '/me/email/change') return { accepted: true };
    throw new ApiError({ message: 'x', status: 400, kind: 'validation', code: 'EMAIL_PIN_INVALID' });
  });
  const { result } = renderFlow();
  act(() => {
    result.current.setNewEmail('nuevo@repp.app');
    result.current.setPassword('secreta');
  });
  await act(async () => result.current.send());
  await waitFor(() => expect(result.current.step).toBe('confirm'));
  act(() => result.current.setPin('000000'));
  await waitFor(() => expect(result.current.failure?.field).toBe('pin'));
  expect(result.current.pin).toBe('');
  expect(mocks.back).not.toHaveBeenCalled();
});
