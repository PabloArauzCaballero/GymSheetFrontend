import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { ClosurePreview } from '@/shared/api/schemas';
import { AccountClosure } from './account-closure';

const mocks = vi.hoisted(() => ({
  closurePreview: vi.fn(),
  requestClosurePin: vi.fn(),
  closeAccount: vi.fn(),
  leave: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('../services/privacy-service', () => ({
  privacyService: {
    closurePreview: mocks.closurePreview,
    requestClosurePin: mocks.requestClosurePin,
    closeAccount: mocks.closeAccount,
  },
  leaveClosedAccount: mocks.leave,
}));
vi.mock('@/shared/notifications', () => ({ confirm: mocks.confirm, notify: { error: vi.fn() } }));

const preview = (emailPin: boolean): ClosurePreview => ({
  allowed: true,
  proof: { password: true, emailPin },
  account: {
    label: 'Tu cuenta',
    disposition: 'ANONYMIZED',
    reason: 'Se borran tu correo, nombre, fecha de nacimiento y sexo.',
  },
  deleted: [{ table: 'training.workouts', label: 'Entrenamientos', count: 42, reason: null }],
  anonymized: [{ table: 'chat.messages', label: 'Mensajes enviados', count: 7, reason: 'Las otras personas conservan la conversación.' }],
  kept: [{ table: 'billing.invoices', label: 'Facturas', count: 3, reason: 'El gimnasio debe conservarlas por ley.' }],
});

function renderClosure() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AccountClosure />
    </QueryClientProvider>,
  );
}

async function openPreview() {
  fireEvent.click(screen.getByRole('button', { name: 'Revisar qué se borra' }));
  return screen.findByRole('region', { name: 'Se borra' });
}

describe('AccountClosure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue({ confirmed: true, action: 'confirm' });
    mocks.closeAccount.mockResolvedValue({ closed: true, closedAt: '2026-11-16T10:00:00.000Z' });
  });

  it('lists what is deleted, anonymized and kept, with the reasons', async () => {
    mocks.closurePreview.mockResolvedValue(preview(false));
    renderClosure();
    const deleted = await openPreview();
    expect(within(deleted).getByText('Entrenamientos')).toBeInTheDocument();
    expect(within(deleted).getByText('42')).toBeInTheDocument();
    const anonymized = screen.getByRole('region', { name: 'Queda sin datos tuyos' });
    expect(within(anonymized).getByText('Las otras personas conservan la conversación.')).toBeInTheDocument();
    const kept = screen.getByRole('region', { name: 'Se conserva' });
    expect(within(kept).getByText('El gimnasio debe conservarlas por ley.')).toBeInTheDocument();
    // A password account has a single proof: no switch to a PIN.
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('closes with the password after the final confirmation, then leaves', async () => {
    mocks.closurePreview.mockResolvedValue(preview(false));
    mocks.closeAccount
      .mockRejectedValueOnce(
        new ApiError({ message: 'Mal', status: 400, kind: 'validation', code: 'CURRENT_PASSWORD_INVALID' }),
      )
      .mockResolvedValueOnce({ closed: true, closedAt: '2026-11-16T10:00:00.000Z' });
    renderClosure();
    await openPreview();

    fireEvent.change(screen.getByLabelText('Tu contraseña'), { target: { value: 'equivocada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mi cuenta' }));
    expect(await screen.findByText('La contraseña no es correcta.')).toBeInTheDocument();
    expect(mocks.leave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Tu contraseña'), { target: { value: 'la-buena-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mi cuenta' }));
    await waitFor(() => expect(mocks.closeAccount).toHaveBeenLastCalledWith({ password: 'la-buena-123' }));
    expect(mocks.confirm.mock.calls.at(-1)?.[0]).toMatchObject({ severity: 'danger' });
    await waitFor(() => expect(mocks.leave).toHaveBeenCalledTimes(1));
  });

  it('does nothing when the final confirmation is cancelled', async () => {
    mocks.closurePreview.mockResolvedValue(preview(false));
    mocks.confirm.mockResolvedValue({ confirmed: false, action: 'cancel' });
    renderClosure();
    await openPreview();
    fireEvent.change(screen.getByLabelText('Tu contraseña'), { target: { value: 'la-buena-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mi cuenta' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.closeAccount).not.toHaveBeenCalled();
  });

  it('closes a Google/Apple account with an emailed PIN', async () => {
    mocks.closurePreview.mockResolvedValue(preview(true));
    mocks.requestClosurePin.mockResolvedValue({ accepted: true });
    renderClosure();
    await openPreview();

    fireEvent.click(screen.getByRole('radio', { name: 'Código por correo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByText('Te enviamos un código a tu correo.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Código del correo'), { target: { value: '12 34 56' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mi cuenta' }));

    await waitFor(() => expect(mocks.closeAccount).toHaveBeenCalledWith({ pin: '123456' }));
    await waitFor(() => expect(mocks.leave).toHaveBeenCalled());
  });

  it('tells staff that the gym closes their account', async () => {
    mocks.closurePreview.mockResolvedValue({ ...preview(false), allowed: false });
    renderClosure();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar qué se borra' }));
    expect(
      await screen.findByText('Las cuentas del personal las cierra el administrador del gimnasio.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar mi cuenta' })).toBeNull();
  });
});
