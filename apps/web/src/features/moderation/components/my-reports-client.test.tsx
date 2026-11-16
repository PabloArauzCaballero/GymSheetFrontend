import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { list, withdraw, confirm, success, error } = vi.hoisted(() => ({
  list: vi.fn(),
  withdraw: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/features/moderation/services/my-reports-service', () => ({
  myReportsKey: ['moderation', 'my-reports'],
  myReportsService: { list, withdraw },
}));
vi.mock('@/shared/notifications', () => ({ confirm, notify: { success, error } }));

import { MyReportsClient } from './my-reports-client';

const ID = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';
const routine = {
  id: ID, targetKind: 'ROUTINE', targetId: ID, title: 'Pierna 3 días', ownerName: 'Ana',
  reason: 'SPAM', status: 'EN_REVISION' as const, createdAt: '2026-11-16T10:00:00.123456Z',
};
const person = { ...routine, id: `${ID.slice(0, -1)}2`, targetKind: 'USER', title: null, ownerName: 'Leo Paz', status: 'REVISADA' as const };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MyReportsClient />
    </QueryClientProvider>,
  );
}

describe('«Tus denuncias»', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue({ items: [routine, person], nextCursor: null });
    withdraw.mockResolvedValue({ id: ID, withdrawn: true, withdrawnAt: '2026-11-16T11:00:00Z', contentRestored: false });
  });

  it('lista cada denuncia con su título, tipo, fecha y estado', async () => {
    renderPage();
    expect(await screen.findByText('Pierna 3 días')).toBeInTheDocument();
    expect(screen.getByText('Leo Paz')).toBeInTheDocument();
    expect(screen.getByText(/^Rutina · /u)).toBeInTheDocument();
    expect(screen.getByText(/^Perfil · /u)).toBeInTheDocument();
    expect(screen.getByText('En revisión')).toBeInTheDocument();
    expect(screen.getByText('Revisada')).toBeInTheDocument();
  });

  it('retirar pide confirmación; «Volver» no retira nada', async () => {
    confirm.mockResolvedValue({ confirmed: false, action: 'cancel' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Retirar denuncia: Pierna 3 días' }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(confirm.mock.calls[0]?.[0]).toMatchObject({ title: 'Retirar denuncia', confirmLabel: 'Retirar', cancelLabel: 'Volver' });
    expect(withdraw).not.toHaveBeenCalled();
  });

  it('al confirmar, retira esa denuncia, avisa y vuelve a pedir la lista', async () => {
    confirm.mockResolvedValue({ confirmed: true, action: 'confirm' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Retirar denuncia: Leo Paz' }));
    await waitFor(() => expect(withdraw).toHaveBeenCalledWith(person.id));
    expect(confirm.mock.calls[0]?.[0]?.message).toContain('se mantiene');
    // A person: withdrawing does not reconnect, and the copy does not promise it.
    expect(confirm.mock.calls[0]?.[0]?.message).toContain('no vuelve solo');
    expect(confirm.mock.calls[0]?.[0]?.message).not.toContain('vuelve a aparecerte');
    await waitFor(() => expect(success).toHaveBeenCalledWith('Denuncia retirada.'));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('vacío y error tienen su estado', async () => {
    list.mockResolvedValueOnce({ items: [], nextCursor: null });
    const { unmount } = renderPage();
    expect(await screen.findByText('No tienes denuncias')).toBeInTheDocument();
    unmount();
    list.mockRejectedValueOnce(new Error('Sin conexión'));
    renderPage();
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
  });
});
