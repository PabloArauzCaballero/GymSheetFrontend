import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { ClosurePreview } from '@/shared/api/schemas';
import { AccountClosure } from '@/features/privacy/components/account-closure';
import { KycErasure } from './kyc-erasure';

const mocks = vi.hoisted(() => ({
  closurePreview: vi.fn(),
  closeAccount: vi.fn(),
  leave: vi.fn(),
  confirm: vi.fn(),
  erase: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/features/privacy/services/privacy-service', () => ({
  privacyService: { closurePreview: mocks.closurePreview, requestClosurePin: vi.fn(), closeAccount: mocks.closeAccount },
  leaveClosedAccount: mocks.leave,
}));
vi.mock('@/features/business/services/business-kyc-client', () => ({ businessKycService: { erase: mocks.erase } }));
vi.mock('@/shared/notifications', () => ({ confirm: mocks.confirm, notify: { error: vi.fn(), success: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh, push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));

const preview = (blockers: ClosurePreview['blockers']): ClosurePreview => ({
  allowed: true,
  blockers,
  proof: { password: true, emailPin: false },
  account: { label: 'Tu cuenta de negocio', disposition: 'ANONYMIZED', reason: 'Se borran el correo y el nombre de la cuenta.' },
  deleted: [{ table: 'business.payment_config', label: 'Datos de cobro', count: 1, reason: null }],
  anonymized: [],
  kept: [{ table: 'business.orders', label: 'Pedidos confirmados', count: 3, reason: 'Tus clientes conservan sus comprobantes.' }],
});
const pending = [{ code: 'BUSINESS_HAS_PENDING_VERIFICATIONS', count: 1 }];

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.confirm.mockResolvedValue({ confirmed: true, action: 'confirm' });
});

describe('closing a business account (ADR-0028)', () => {
  it('shows the receipts to decide with the way to «Pedidos», and no proof while they wait', async () => {
    mocks.closurePreview.mockResolvedValue(preview(pending));
    wrap(<AccountClosure business />);
    fireEvent.click(screen.getByRole('button', { name: 'Revisar qué se borra' }));
    expect(await screen.findByText('Tienes 1 comprobante de pago por revisar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Pedidos' })).toHaveAttribute('href', '/negocio/pedidos');
    expect(screen.queryByLabelText('Tu contraseña')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cerrar mi cuenta de negocio' })).toBeNull();
  });

  it('lists what happens, asks the password and a last confirmation, then leaves', async () => {
    mocks.closurePreview.mockResolvedValue(preview([]));
    mocks.closeAccount.mockResolvedValue({ closed: true, closedAt: '2026-11-17T10:00:00.000Z' });
    wrap(<AccountClosure business />);
    fireEvent.click(screen.getByRole('button', { name: 'Revisar qué se borra' }));
    expect(await screen.findByRole('region', { name: 'Qué pasa al cerrar' })).toHaveTextContent('180 días');
    expect(screen.getByRole('heading', { name: 'Tu cuenta de negocio' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tu contraseña'), { target: { value: 'NegocioLocal2026!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mi cuenta de negocio' }));
    await waitFor(() => expect(mocks.closeAccount).toHaveBeenCalledWith({ password: 'NegocioLocal2026!' }));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Cerrar tu negocio para siempre?', confirmLabel: 'Cerrar mi negocio' }));
    await waitFor(() => expect(mocks.leave).toHaveBeenCalled());
  });

  it('reads the preview again when a receipt arrived after it (409)', async () => {
    mocks.closurePreview.mockResolvedValueOnce(preview([])).mockResolvedValueOnce(preview(pending));
    mocks.closeAccount.mockRejectedValue(
      new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'BUSINESS_HAS_PENDING_VERIFICATIONS', details: { count: 1 } }),
    );
    wrap(<AccountClosure business />);
    fireEvent.click(screen.getByRole('button', { name: 'Revisar qué se borra' }));
    fireEvent.change(await screen.findByLabelText('Tu contraseña'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mi cuenta de negocio' }));
    expect(await screen.findByText('Tienes 1 comprobante de pago por revisar')).toBeInTheDocument();
    expect(mocks.closurePreview).toHaveBeenCalledTimes(2);
    expect(mocks.leave).not.toHaveBeenCalled();
  });
});

describe('erasing the KYC on request', () => {
  async function fillAndSubmit(password: string) {
    fireEvent.click(screen.getByRole('button', { name: 'Revisar qué se borra' }));
    expect(screen.getByText(/Tu negocio queda suspendido/u)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tu contraseña'), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: 'Borrar mis documentos' }));
  }

  it('says the business stays suspended, confirms twice and sends the password', async () => {
    mocks.erase.mockResolvedValue({ status: 'SUSPENDED', suspensionReasonCode: 'KYC_MISSING', kycStatus: 'SUSPENDED', documentsErased: 4 });
    wrap(<KycErasure />);
    await fillAndSubmit('NegocioLocal2026!');
    await waitFor(() => expect(mocks.erase).toHaveBeenCalledWith('NegocioLocal2026!'));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ severity: 'danger', confirmLabel: 'Borrar y suspender' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Tu negocio está suspendido');
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('does nothing when the second confirmation is cancelled, and names a wrong password', async () => {
    mocks.confirm.mockResolvedValueOnce({ confirmed: false, action: 'cancel' });
    wrap(<KycErasure />);
    await fillAndSubmit('otra');
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.erase).not.toHaveBeenCalled();

    mocks.erase.mockRejectedValue(new ApiError({ message: 'x', status: 400, kind: 'validation', code: 'CURRENT_PASSWORD_INVALID' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar mis documentos' }));
    expect(await screen.findByText('La contraseña no es correcta.')).toBeInTheDocument();
  });

  it('asks for the password before anything else', async () => {
    wrap(<KycErasure />);
    fireEvent.click(screen.getByRole('button', { name: 'Revisar qué se borra' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar mis documentos' }));
    expect(await screen.findByText('Escribe tu contraseña.')).toBeInTheDocument();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
});
