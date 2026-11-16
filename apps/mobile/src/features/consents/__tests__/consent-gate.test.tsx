import type {} from '../../../../../web/node_modules/vitest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiError } from '@gymsheet/api-client';
import { consentsSectionCopy } from '@gymsheet/domain';
import { useConsentGate } from '../ask-consent';
import { useConsents } from '../use-consents';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  confirm: vi.fn(),
  notify: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock('@/api/client', () => ({ apiClient: { request: mocks.request } }));
vi.mock('@/notifications', () => ({ confirm: mocks.confirm, notify: mocks.notify }));

const consent = (kind: string, granted: boolean) => ({
  kind, granted, version: granted ? '2026-12-01' : null, currentVersion: '2026-12-01',
  upToDate: granted, grantedAt: null, revokedAt: null,
});
const list = (granted: Record<string, boolean> = {}) => ({
  consents: ['HEALTH', 'ORIENTATION', 'VERIFICATION_SELFIE', 'PRECISE_LOCATION'].map((kind) => consent(kind, granted[kind] ?? false)),
});
const consentRequired = (kind: string) =>
  new ApiError({ message: 'Falta tu consentimiento.', status: 400, kind: 'validation', code: 'CONSENT_REQUIRED', details: { kind } });

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.confirm.mockResolvedValue({ confirmed: true });
  mocks.request.mockImplementation(async (path: string, _schema: unknown, options: { method: string; body?: { granted: boolean } }) => {
    if (path === '/me/consents') return list();
    if (path.startsWith('/me/consents/') && options.method === 'PUT') {
      return consent(decodeURIComponent(path.split('/').pop() ?? ''), Boolean(options.body?.granted));
    }
    throw new Error(`unexpected ${path}`);
  });
});

test('a 400 CONSENT_REQUIRED asks inline, grants the current version and retries the save', async () => {
  const { result } = renderHook(() => useConsentGate(), { wrapper: wrapper() });
  const save = vi.fn().mockRejectedValueOnce(consentRequired('ORIENTATION')).mockResolvedValue('guardado');
  let outcome: unknown;
  await act(async () => { outcome = await result.current.withConsent(save); });
  expect(outcome).toEqual({ done: true, value: 'guardado' });
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: consentsSectionCopy.promptTitle('ORIENTATION') }));
  expect(mocks.request).toHaveBeenCalledWith('/me/consents/ORIENTATION', expect.anything(), {
    method: 'PUT',
    body: { granted: true, version: '2026-12-01' },
  });
  expect(save).toHaveBeenCalledTimes(2);
});

test('declining leaves the datum unsaved and records nothing', async () => {
  mocks.confirm.mockResolvedValue({ confirmed: false });
  const { result } = renderHook(() => useConsentGate(), { wrapper: wrapper() });
  const save = vi.fn().mockRejectedValue(consentRequired('PRECISE_LOCATION'));
  let outcome: unknown;
  await act(async () => { outcome = await result.current.withConsent(save); });
  expect(outcome).toEqual({ done: false, kind: 'PRECISE_LOCATION' });
  expect(save).toHaveBeenCalledTimes(1);
  expect(mocks.request).not.toHaveBeenCalledWith(expect.stringMatching(/^\/me\/consents\//), expect.anything(), expect.anything());
});

test('ensure does not ask again for a consent already given to the current text', async () => {
  mocks.request.mockImplementation(async (path: string) => (path === '/me/consents' ? list({ PRECISE_LOCATION: true }) : null));
  const { result } = renderHook(() => useConsentGate(), { wrapper: wrapper() });
  let granted = false;
  await act(async () => { granted = await result.current.ensure('PRECISE_LOCATION'); });
  expect(granted).toBe(true);
  expect(mocks.confirm).not.toHaveBeenCalled();
});

test('a text changed under the prompt (409) records nothing and says so', async () => {
  mocks.request.mockImplementation(async (path: string) => {
    if (path === '/me/consents') return list();
    throw new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'CONSENT_VERSION_OUTDATED', details: { currentVersion: '2027-01-01' } });
  });
  const { result } = renderHook(() => useConsentGate(), { wrapper: wrapper() });
  let granted = true;
  await act(async () => { granted = await result.current.ensure('HEALTH'); });
  expect(granted).toBe(false);
  expect(mocks.notify.warning).toHaveBeenCalledWith(consentsSectionCopy.versionChanged);
});

test('revoking from Privacidad y datos confirms what is erased first, then revokes', async () => {
  mocks.request.mockImplementation(async (path: string, _schema: unknown, options: { method: string; body?: { granted: boolean } }) => {
    if (path === '/me/consents') return list({ PRECISE_LOCATION: true });
    return consent('PRECISE_LOCATION', Boolean(options.body?.granted));
  });
  const { result } = renderHook(() => useConsents(), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.consents.isSuccess).toBe(true));
  act(() => result.current.toggle('PRECISE_LOCATION', false));
  await waitFor(() => expect(mocks.notify.success).toHaveBeenCalledWith(consentsSectionCopy.revokedNotice));
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ severity: 'danger', message: expect.stringMatching(/ubicación/) }));
  expect(mocks.request).toHaveBeenCalledWith('/me/consents/PRECISE_LOCATION', expect.anything(), { method: 'PUT', body: { granted: false } });
  await waitFor(() => expect(result.current.consents.data?.find((item) => item.kind === 'PRECISE_LOCATION')?.granted).toBe(false));
});
