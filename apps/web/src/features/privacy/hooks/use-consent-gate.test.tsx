import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { useConsentGate } from './use-consent-gate';

const mocks = vi.hoisted(() => ({
  consents: vi.fn(),
  setConsent: vi.fn(),
  confirm: vi.fn(),
  notify: { error: vi.fn() },
}));
vi.mock('../services/privacy-service', () => ({
  privacyService: { consents: mocks.consents, setConsent: mocks.setConsent },
}));
vi.mock('@/shared/notifications', () => ({ confirm: mocks.confirm, notify: mocks.notify }));

const required = new ApiError({
  message: 'Para guardar tu orientación primero tienes que dar tu consentimiento para ese dato.',
  status: 400,
  kind: 'validation',
  code: 'CONSENT_REQUIRED',
  details: { kind: 'ORIENTATION' },
});
const orientation = (granted: boolean) => ({
  kind: 'ORIENTATION',
  granted,
  version: granted ? '2026-12-02' : null,
  currentVersion: '2026-12-02',
  upToDate: granted,
  grantedAt: null,
  revokedAt: null,
});

function renderGate() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useConsentGate(), { wrapper }).result;
}

describe('useConsentGate.withConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consents.mockResolvedValue([orientation(false)]);
    mocks.setConsent.mockResolvedValue(orientation(true));
  });

  it('on CONSENT_REQUIRED asks for that consent, grants the current version and retries once', async () => {
    mocks.confirm.mockResolvedValue({ confirmed: true, action: 'confirm' });
    const save = vi.fn().mockRejectedValueOnce(required).mockResolvedValue('guardado');
    const gate = renderGate();

    let result: unknown;
    await act(async () => {
      result = await gate.current.withConsent(save);
    });

    expect(result).toBe('guardado');
    expect(save).toHaveBeenCalledTimes(2);
    expect(mocks.confirm.mock.calls[0]?.[0]).toMatchObject({
      title: 'Falta tu consentimiento: Orientación',
      message: 'Guardamos tu orientación para tu perfil de Conocer. Solo se ve si activas «Mostrar en mi perfil». Nunca la usamos para ordenar ni filtrar perfiles.',
    });
    expect(mocks.setConsent).toHaveBeenCalledWith('ORIENTATION', { granted: true, version: '2026-12-02' });
  });

  it('rethrows the original failure when the person declines, without granting', async () => {
    mocks.confirm.mockResolvedValue({ confirmed: false, action: 'cancel' });
    const save = vi.fn().mockRejectedValue(required);
    const gate = renderGate();

    await act(async () => {
      await expect(gate.current.withConsent(save)).rejects.toBe(required);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(mocks.setConsent).not.toHaveBeenCalled();
  });

  it('leaves any other failure alone', async () => {
    const other = new ApiError({ message: 'Caído', status: 503, kind: 'unexpected' });
    const gate = renderGate();
    await act(async () => {
      await expect(gate.current.withConsent(() => Promise.reject(other))).rejects.toBe(other);
    });
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('ensure() does not ask when the consent is already active', async () => {
    mocks.consents.mockResolvedValue([orientation(true)]);
    const gate = renderGate();
    let granted: boolean | undefined;
    await act(async () => {
      granted = await gate.current.ensure('ORIENTATION');
    });
    expect(granted).toBe(true);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
});
