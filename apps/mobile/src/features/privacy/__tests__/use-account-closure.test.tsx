import type {} from '../../../../../web/node_modules/vitest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiError } from '@gymsheet/api-client';
import { accountClosureCopy } from '@gymsheet/domain';
import { useAccountClosure } from '../use-account-closure';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  confirm: vi.fn(),
  endClosedAccount: vi.fn(),
  clearCatalogCache: vi.fn(),
  deleteCachedExport: vi.fn(),
}));

vi.mock('@/api/client', () => ({ apiClient: { request: mocks.request } }));
vi.mock('@/notifications', () => ({ confirm: mocks.confirm }));
vi.mock('@/lib/query-cache', () => ({ clearCatalogCache: mocks.clearCatalogCache }));
vi.mock('../export-file', () => ({ deleteCachedExport: mocks.deleteCachedExport }));
vi.mock('expo-haptics', () => ({ notificationAsync: vi.fn(), NotificationFeedbackType: { Error: 'error' } }));
vi.mock('@/state/auth-store', () => ({
  useAuthStore: (select: (state: object) => unknown) =>
    select({ endClosedAccount: mocks.endClosedAccount }),
}));

const preview = (emailPin: boolean) => ({
  allowed: true,
  proof: { password: true, emailPin },
  account: { label: 'Tu cuenta', disposition: 'ANONYMIZED', reason: 'Se borran tu correo y tu nombre.' },
  deleted: [{ table: 'social.messages', label: 'Mensajes', count: 3, reason: null }],
  anonymized: [],
  kept: [],
});

function route(emailPin: boolean, close: () => unknown = () => ({ closed: true, closedAt: '2026-11-16T12:00:00.000Z' })) {
  mocks.request.mockImplementation(async (path: string, _schema: unknown, options: { method: string }) => {
    if (path === '/me/account/closure-preview') return preview(emailPin);
    if (path === '/me/account/closure-pin') return { accepted: true };
    if (path === '/me/account' && options.method === 'DELETE') return close();
    throw new Error(`unexpected ${path}`);
  });
}

function renderClosure(business = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(['chat', 'conversations'], [{ id: 'privado' }]);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => useAccountClosure(business), { wrapper }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.confirm.mockResolvedValue({ confirmed: true });
  mocks.endClosedAccount.mockResolvedValue(undefined);
});

test('password proof, final confirmation, then this phone forgets the account', async () => {
  route(false);
  const { result, client } = renderClosure();
  await waitFor(() => expect(result.current.preview.isSuccess).toBe(true));
  expect(result.current.methods).toEqual(['password']);

  act(() => result.current.setValue('secreta'));
  await act(async () => result.current.submit());

  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: accountClosureCopy.confirmTitle, severity: 'danger' }));
  await waitFor(() => expect(mocks.endClosedAccount).toHaveBeenCalledTimes(1));
  expect(mocks.request).toHaveBeenCalledWith('/me/account', expect.anything(), { method: 'DELETE', body: { password: 'secreta' } });

  // The caches handed to the wipe drop the query cache and every local copy of this account.
  const caches = mocks.endClosedAccount.mock.calls[0]?.[0] as (() => unknown)[];
  for (const clear of caches) await clear();
  expect(client.getQueryCache().getAll()).toHaveLength(0);
  expect(mocks.clearCatalogCache).toHaveBeenCalled();
  expect(mocks.deleteCachedExport).toHaveBeenCalled();
});

test('cancelling the final confirmation closes nothing', async () => {
  route(false);
  mocks.confirm.mockResolvedValue({ confirmed: false });
  const { result } = renderClosure();
  await waitFor(() => expect(result.current.preview.isSuccess).toBe(true));
  act(() => result.current.setValue('secreta'));
  await act(async () => result.current.submit());
  expect(mocks.request).not.toHaveBeenCalledWith('/me/account', expect.anything(), expect.objectContaining({ method: 'DELETE' }));
  expect(mocks.endClosedAccount).not.toHaveBeenCalled();
});

test('a wrong password stays on the field and keeps the session', async () => {
  route(false, () => {
    throw new ApiError({ message: 'x', status: 400, kind: 'validation', code: 'CURRENT_PASSWORD_INVALID' });
  });
  const { result } = renderClosure();
  await waitFor(() => expect(result.current.preview.isSuccess).toBe(true));
  act(() => result.current.setValue('mal'));
  await act(async () => result.current.submit());
  await waitFor(() => expect(result.current.failure).toEqual({ field: 'password', message: accountClosureCopy.errors.CURRENT_PASSWORD_INVALID }));
  expect(mocks.endClosedAccount).not.toHaveBeenCalled();
});

test('Google/Apple accounts can prove it with the emailed code', async () => {
  route(true);
  const { result } = renderClosure();
  await waitFor(() => expect(result.current.methods).toEqual(['password', 'pin']));

  act(() => result.current.choose('pin'));
  await act(async () => result.current.sendPin());
  await waitFor(() => expect(result.current.pinSent).toBe(true));
  expect(mocks.request).toHaveBeenCalledWith('/me/account/closure-pin', expect.anything(), { method: 'POST' });

  act(() => result.current.setValue('123456'));
  await act(async () => result.current.submit());
  await waitFor(() => expect(mocks.endClosedAccount).toHaveBeenCalled());
  expect(mocks.request).toHaveBeenCalledWith('/me/account', expect.anything(), { method: 'DELETE', body: { pin: '123456' } });
});

test('an incomplete proof is caught before anything is asked', async () => {
  route(false);
  const { result } = renderClosure();
  await waitFor(() => expect(result.current.preview.isSuccess).toBe(true));
  await act(async () => result.current.submit());
  expect(result.current.failure?.field).toBe('password');
  expect(mocks.confirm).not.toHaveBeenCalled();
});

test('a business with receipts to decide gets its blocker, and a 409 re-reads it (ADR-0028)', async () => {
  let blockers: unknown[] = [];
  mocks.request.mockImplementation(async (path: string, _schema: unknown, options: { method: string }) => {
    if (path === '/me/account/closure-preview') return { ...preview(false), blockers };
    if (path === '/me/account' && options.method === 'DELETE') {
      blockers = [{ code: 'BUSINESS_HAS_PENDING_VERIFICATIONS', count: 2 }];
      throw new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'BUSINESS_HAS_PENDING_VERIFICATIONS', details: { count: 2 } });
    }
    throw new Error(`unexpected ${path}`);
  });
  const { result } = renderClosure(true);
  await waitFor(() => expect(result.current.preview.isSuccess).toBe(true));
  expect(result.current.blockers).toEqual([]);
  act(() => result.current.setValue('secreta'));
  await act(async () => result.current.submit());
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Cerrar tu negocio para siempre?' }));
  await waitFor(() => expect(result.current.blockers[0]?.title).toBe('Tienes 2 comprobantes de pago por revisar'));
  expect(result.current.failure).toEqual({ field: null, message: accountClosureCopy.errors.BUSINESS_HAS_PENDING_VERIFICATIONS });
  expect(mocks.endClosedAccount).not.toHaveBeenCalled();
});
