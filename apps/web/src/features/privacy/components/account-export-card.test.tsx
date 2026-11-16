import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { AccountExportStatus } from '@/shared/api/schemas';
import { AccountExportCard } from './account-export-card';

const mocks = vi.hoisted(() => ({ requestExport: vi.fn(), latestExport: vi.fn() }));
vi.mock('@gymsheet/domain', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@gymsheet/domain')>()),
  // Poll fast in tests; the rule (poll only while PENDING) is the real one.
  accountExportPollInterval: (status?: { status: string }) => (status?.status === 'PENDING' ? 20 : false),
}));
vi.mock('../services/privacy-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/privacy-service')>()),
  privacyService: { requestExport: mocks.requestExport, latestExport: mocks.latestExport },
}));

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const status = (overrides: Partial<AccountExportStatus>): AccountExportStatus => ({
  id,
  status: 'PENDING',
  requestedAt: '2026-11-16T10:00:00.000Z',
  completedAt: null,
  expiresAt: null,
  sizeBytes: null,
  downloadPath: null,
  ...overrides,
});
const ready = status({
  status: 'READY',
  expiresAt: '2026-11-23T10:00:00.000Z',
  downloadPath: `/me/export/${id}/download`,
});

/** A fresh client per render is a fresh page load: nothing survives but the server. */
function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AccountExportCard />
    </QueryClientProvider>,
  );
}

describe('AccountExportCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests the copy, polls while it is pending and offers the download once ready', async () => {
    mocks.latestExport.mockResolvedValueOnce(null).mockResolvedValueOnce(status({})).mockResolvedValue(ready);
    mocks.requestExport.mockResolvedValue(status({}));
    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: 'Preparar copia' }));
    expect(await screen.findByText('Preparando tu copia. Puede tardar unos minutos.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preparar copia' })).toBeNull();

    const link = await screen.findByRole('link', { name: 'Descargar copia' });
    expect(link).toHaveAttribute('href', `/api/backend/me/export/${id}/download`);
    expect(link).toHaveAttribute('download');
    expect(mocks.latestExport.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('after a reload resumes a pending copy and keeps polling until it is ready', async () => {
    mocks.latestExport.mockResolvedValueOnce(status({})).mockResolvedValue(ready);
    renderCard();

    expect(await screen.findByText('Preparando tu copia. Puede tardar unos minutos.')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Descargar copia' })).toBeInTheDocument();
    expect(mocks.requestExport).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Preparar copia' })).toBeNull();
  });

  it('after a reload offers the download of a ready copy straight away', async () => {
    mocks.latestExport.mockResolvedValue(ready);
    renderCard();
    expect(await screen.findByRole('link', { name: 'Descargar copia' })).toBeInTheDocument();
    expect(screen.getByText(/Disponible hasta el/u)).toBeInTheDocument();
  });

  it('says when a copy could not be built and offers a new request', async () => {
    mocks.latestExport.mockResolvedValue(status({ status: 'FAILED' }));
    renderCard();
    expect(await screen.findByText('No pudimos preparar tu copia. Inténtalo más tarde.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preparar copia' })).toBeInTheDocument();
  });

  it('explains the daily limit with the wait the server gives', async () => {
    mocks.latestExport.mockResolvedValue(null);
    mocks.requestExport.mockRejectedValue(
      new ApiError({
        message: 'Ya pediste una copia de tus datos hoy.',
        status: 429,
        kind: 'rate-limit',
        code: 'ACCOUNT_EXPORT_RATE_LIMITED',
        details: { retryAfterSeconds: 82_800 },
      }),
    );
    renderCard();
    fireEvent.click(await screen.findByRole('button', { name: 'Preparar copia' }));
    expect(await screen.findByText('Ya pediste una copia hoy. Pide otra en 23 h.')).toBeInTheDocument();
  });
});
