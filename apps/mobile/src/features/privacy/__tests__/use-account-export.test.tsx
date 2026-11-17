import type {} from '../../../../../web/node_modules/vitest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiError } from '@gymsheet/api-client';
import { useAccountExport } from '../use-account-export';

const ID = '00000000-0000-4000-8000-000000000001';
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  share: vi.fn(),
  notify: { error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/api/client', () => ({ apiClient: { request: mocks.request } }));
vi.mock('@/notifications', () => ({ notify: mocks.notify }));
vi.mock('../export-file', () => ({ shareAccountExport: mocks.share }));

const status = (state: 'PENDING' | 'READY' | 'FAILED', downloadPath: string | null = null) => ({
  id: ID,
  status: state,
  requestedAt: '2026-11-16T10:00:00.000Z',
  completedAt: null,
  expiresAt: state === 'READY' ? '2026-11-23T10:00:00.000Z' : null,
  sizeBytes: null,
  downloadPath,
});

/** Routes `GET /me/export/latest` to `latest()` and `POST /me/export` to `create()`. */
function route(latest: () => unknown, create: () => unknown = () => status('PENDING')) {
  mocks.request.mockImplementation(async (path: string, _schema: unknown, options: { method: string }) => {
    if (path === '/me/export/latest') return { export: latest() };
    if (path === '/me/export' && options.method === 'POST') return create();
    throw new Error(`unexpected ${path}`);
  });
}

function renderExport() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useAccountExport(), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.share.mockResolvedValue(true);
});

test('no request yet: request one, poll the latest until ready, then download and share it', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    let latest: unknown = null;
    let polls = 0;
    route(() => {
      if (latest) polls += 1;
      if (latest && polls >= 2) latest = status('READY', `/me/export/${ID}/download`);
      return latest;
    }, () => (latest = status('PENDING')));
    const { result } = renderExport();
    await waitFor(() => expect(result.current.view.kind).toBe('idle'));

    await act(async () => result.current.act());
    await waitFor(() => expect(result.current.view.kind).toBe('pending'));

    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    await waitFor(() => expect(result.current.view.kind).toBe('ready'));

    await act(async () => result.current.act());
    await waitFor(() => expect(mocks.share).toHaveBeenCalledWith(ID, `/me/export/${ID}/download`));
  } finally {
    vi.useRealTimers();
  }
});

test('a copy requested earlier (another launch or device) resumes from the server on mount', async () => {
  route(() => status('PENDING'));
  const { result } = renderExport();
  await waitFor(() => expect(result.current.view.kind).toBe('pending'));
  expect(mocks.request).toHaveBeenCalledWith('/me/export/latest', expect.anything(), { method: 'GET' });
  expect(mocks.request).not.toHaveBeenCalledWith('/me/export', expect.anything(), { method: 'POST' });
});

test('a 429 says how long to wait instead of a toast', async () => {
  route(() => null, () => {
    throw new ApiError({
      message: 'Ya pediste una copia hoy.',
      status: 429,
      kind: 'rate-limit',
      code: 'ACCOUNT_EXPORT_RATE_LIMITED',
      details: { retryAfterSeconds: 7_200 },
    });
  });
  const { result } = renderExport();
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => result.current.act());
  await waitFor(() => expect(result.current.view).toEqual({ kind: 'rate-limited', retryAfterSeconds: 7_200 }));
  expect(mocks.notify.error).not.toHaveBeenCalled();
});

test('without a share sheet the person is told where to get it', async () => {
  route(() => status('READY', `/me/export/${ID}/download`));
  mocks.share.mockResolvedValue(false);
  const { result } = renderExport();
  await waitFor(() => expect(result.current.view.kind).toBe('ready'));
  await act(async () => result.current.act());
  await waitFor(() => expect(mocks.notify.warning).toHaveBeenCalled());
});
