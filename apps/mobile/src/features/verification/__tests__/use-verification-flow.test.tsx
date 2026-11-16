import type {} from '../../../../../web/node_modules/vitest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiError } from '@gymsheet/api-client';
import { useVerificationFlow } from '../use-verification-flow';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  upload: vi.fn(),
  confirm: vi.fn(),
  notify: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
  cameraPermission: vi.fn(),
  launchCamera: vi.fn(),
}));

vi.mock('@/api/client', () => ({ apiClient: { request: mocks.request, upload: mocks.upload } }));
vi.mock('@/api/local-file-part', () => ({ appendLocalFile: vi.fn(async () => undefined) }));
vi.mock('@/notifications', () => ({ confirm: mocks.confirm, notify: mocks.notify }));
vi.mock('expo-image-picker', () => ({
  CameraType: { front: 'front', back: 'back' },
  requestCameraPermissionsAsync: mocks.cameraPermission,
  launchCameraAsync: mocks.launchCamera,
}));

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const challenge = (ms = 600_000) => ({
  id,
  gesture: { code: 'POINT_UP', instruction: 'Señala hacia arriba con el dedo índice junto a tu cara' },
  expiresAt: new Date(Date.now() + ms).toISOString(),
});
const consent = (granted: boolean) => ({
  kind: 'VERIFICATION_SELFIE', granted, version: granted ? '2026-12-01' : null, currentVersion: '2026-12-01',
  upToDate: granted, grantedAt: null, revokedAt: null,
});
const apiError = (status: number, code: string, details?: Record<string, unknown>) =>
  new ApiError({ message: code, status, kind: 'validation', code, details });

let granted = false;
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  granted = false;
  mocks.confirm.mockResolvedValue({ confirmed: true });
  mocks.cameraPermission.mockResolvedValue({ granted: true });
  mocks.launchCamera.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///selfie.jpg', mimeType: 'image/jpeg', fileName: null }] });
  mocks.request.mockImplementation(async (path: string, _schema: unknown, options: { method: string }) => {
    if (path === '/me/verification') return { status: 'NONE', verifiedAt: null, challenge: null, lastDecision: null, canRetryAt: null };
    if (path === '/me/consents') return { consents: [consent(granted)] };
    if (path === '/me/consents/VERIFICATION_SELFIE' && options.method === 'PUT') {
      granted = true;
      return consent(true);
    }
    if (path === '/me/verification/challenge') return challenge();
    throw new Error(`unexpected ${path}`);
  });
});

async function renderReady() {
  const hook = renderHook(() => useVerificationFlow(), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.step).toBe('status'));
  return hook;
}

test('a declined consent never requests a challenge nor opens the camera', async () => {
  mocks.confirm.mockResolvedValue({ confirmed: false });
  const { result } = await renderReady();
  await act(async () => { await result.current.start(); });

  expect(mocks.request.mock.calls.some(([path]) => path === '/me/verification/challenge')).toBe(false);
  expect(mocks.cameraPermission).not.toHaveBeenCalled();
  expect(result.current.step).toBe('status');
  expect(mocks.notify.info).toHaveBeenCalledWith('Sin tu consentimiento no podemos usar una selfie para verificarte.');
});

test('grants the consent before the challenge, then opens the front camera', async () => {
  const { result } = await renderReady();
  await act(async () => { await result.current.start(); });

  const paths = mocks.request.mock.calls.map(([path]) => path);
  expect(paths.indexOf('/me/consents/VERIFICATION_SELFIE')).toBeLessThan(paths.indexOf('/me/verification/challenge'));
  expect(result.current.step).toBe('capture');
  expect(result.current.seconds).toBeGreaterThan(590);

  await act(async () => { await result.current.capture(); });
  expect(mocks.launchCamera).toHaveBeenCalledWith(expect.objectContaining({ cameraType: 'front', mediaTypes: ['images'] }));
  expect(result.current.shot).toEqual({ uri: 'file:///selfie.jpg', name: 'selfie.jpg', mimeType: 'image/jpeg' });
});

test('uploads and lands on in review', async () => {
  mocks.upload.mockResolvedValue({ id, status: 'PENDING_REVIEW', submittedAt: null });
  const { result } = await renderReady();
  await act(async () => { await result.current.start(); });
  await act(async () => { await result.current.capture(); });
  mocks.request.mockImplementation(async (path: string) =>
    path === '/me/verification' ? { status: 'PENDING_REVIEW', verifiedAt: null, challenge: null, lastDecision: null, canRetryAt: null } : null);
  await act(async () => { await result.current.upload(); });

  expect(mocks.upload).toHaveBeenCalledWith(`/me/verification/${id}/selfie`, expect.anything(), expect.any(FormData), { timeoutMs: 60_000 });
  await waitFor(() => expect(result.current.status.data?.status).toBe('PENDING_REVIEW'));
  expect(result.current.step).toBe('status');
});

test('a 503 at upload shows the calm unavailable step', async () => {
  mocks.upload.mockRejectedValue(apiError(503, 'VERIFICATION_UNAVAILABLE'));
  const { result } = await renderReady();
  await act(async () => { await result.current.start(); });
  await act(async () => { await result.current.capture(); });
  await act(async () => { await result.current.upload(); });
  expect(result.current.step).toBe('unavailable');
  expect(mocks.notify.error).not.toHaveBeenCalled();
});

test('a 409 expired challenge at upload offers a new gesture, and a 400 consent asks and retries', async () => {
  mocks.upload
    .mockRejectedValueOnce(apiError(409, 'VERIFICATION_CHALLENGE_EXPIRED'))
    .mockRejectedValueOnce(apiError(400, 'CONSENT_REQUIRED', { kind: 'VERIFICATION_SELFIE' }))
    .mockResolvedValue({ id, status: 'PENDING_REVIEW', submittedAt: null });
  const { result } = await renderReady();
  await act(async () => { await result.current.start(); });
  await act(async () => { await result.current.capture(); });
  await act(async () => { await result.current.upload(); });
  expect(result.current.step).toBe('expired');

  await act(async () => { await result.current.start(); });
  expect(result.current.step).toBe('capture');
  await act(async () => { await result.current.capture(); });
  const asked = mocks.confirm.mock.calls.length;
  await act(async () => { await result.current.upload(); });
  expect(mocks.confirm.mock.calls.length).toBe(asked + 1);
  expect(mocks.upload).toHaveBeenCalledTimes(3);
});
