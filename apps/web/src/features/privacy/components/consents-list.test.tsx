import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { Consent } from '@/shared/api/schemas';
import { ConsentsList } from './consents-list';

const mocks = vi.hoisted(() => ({
  consents: vi.fn(),
  setConsent: vi.fn(),
  confirm: vi.fn(),
  notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('../services/privacy-service', () => ({
  privacyService: { consents: mocks.consents, setConsent: mocks.setConsent },
}));
vi.mock('@/shared/notifications', () => ({ confirm: mocks.confirm, notify: mocks.notify }));

const consent = (overrides: Partial<Consent>): Consent => ({
  kind: 'HEALTH',
  granted: false,
  version: null,
  currentVersion: '2026-12-02',
  upToDate: false,
  grantedAt: null,
  revokedAt: null,
  ...overrides,
});

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ConsentsList />
    </QueryClientProvider>,
  );
}

describe('ConsentsList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grants a consent to the current text version', async () => {
    mocks.consents.mockResolvedValue([consent({ kind: 'ORIENTATION' })]);
    mocks.setConsent.mockResolvedValue(consent({ kind: 'ORIENTATION', granted: true, upToDate: true }));
    renderList();

    expect(await screen.findByText('Orientación')).toBeInTheDocument();
    expect(screen.getByTestId('consent-state-ORIENTATION')).toHaveTextContent('Sin aceptar');
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar: Orientación' }));

    await waitFor(() =>
      expect(mocks.setConsent).toHaveBeenCalledWith('ORIENTATION', { granted: true, version: '2026-12-02' }),
    );
    expect(mocks.confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.notify.success).toHaveBeenCalledWith('Consentimiento guardado.'));
  });

  it('revokes only after a confirmation that says what gets erased', async () => {
    mocks.consents.mockResolvedValue([
      consent({ kind: 'PRECISE_LOCATION', granted: true, upToDate: true, version: '2026-12-02' }),
    ]);
    mocks.setConsent.mockResolvedValue(consent({ kind: 'PRECISE_LOCATION' }));
    mocks.confirm
      .mockResolvedValueOnce({ confirmed: false, action: 'cancel' })
      .mockResolvedValueOnce({ confirmed: true, action: 'confirm' });
    renderList();

    const revoke = await screen.findByRole('button', { name: 'Retirar: Ubicación precisa' });
    fireEvent.click(revoke);
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0]?.[0]).toMatchObject({
      severity: 'danger',
      message: 'Borramos tu ubicación y te quitamos del mapa. Conocer calcula distancias desde tu sede.',
    });
    expect(mocks.setConsent).not.toHaveBeenCalled();

    fireEvent.click(revoke);
    await waitFor(() => expect(mocks.setConsent).toHaveBeenCalledWith('PRECISE_LOCATION', { granted: false }));
    await waitFor(() =>
      expect(mocks.notify.success).toHaveBeenCalledWith('Consentimiento retirado. Borramos el dato.'),
    );
  });

  it('asks again for a consent granted to an older text and handles a 409', async () => {
    mocks.consents.mockResolvedValue([consent({ granted: true, upToDate: false, version: '2026-08-25' })]);
    mocks.setConsent.mockRejectedValue(
      new ApiError({ message: 'Cambió', status: 409, kind: 'conflict', code: 'CONSENT_VERSION_OUTDATED' }),
    );
    renderList();

    expect(await screen.findByTestId('consent-state-HEALTH')).toHaveTextContent('El texto cambió');
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar de nuevo: Datos de salud' }));
    await waitFor(() =>
      expect(mocks.notify.warning).toHaveBeenCalledWith(
        'El texto cambió mientras lo leías. Revísalo y acéptalo otra vez.',
      ),
    );
    expect(mocks.consents).toHaveBeenCalledTimes(2);
  });
});
