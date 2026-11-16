import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmStore } from '@gymsheet/notifications';
import { staffClosureCopy } from '@gymsheet/domain';
import { ApiError } from '@/shared/api/api-error';
import { ConfirmRoot } from '@/shared/notifications';
import { UsersPanel } from './users-panel';

const mocks = vi.hoisted(() => ({ close: vi.fn(), users: vi.fn(), success: vi.fn() }));
vi.mock('@/features/admin/services/staff-closure-service', () => ({ staffClosureService: { close: mocks.close } }));
vi.mock('@/features/admin/services/insights-service', () => ({ insightsService: { users: mocks.users } }));
vi.mock('@/shared/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/notifications')>()),
  notify: { success: mocks.success, error: vi.fn() },
}));

const admin = '00000000-0000-4000-8000-0000000000a1';
const coach = '00000000-0000-4000-8000-0000000000c1';
const member = '00000000-0000-4000-8000-0000000000d1';
const row = (id: string, nombreCompleto: string, rol: string) => ({
  id,
  nombreCompleto,
  email: `${id}@example.com`,
  rol,
  estado: 'ACTIVO',
  tenantId: null,
  telefono: null,
  plan: null,
  venceEl: null,
  vigente: false,
  ultimaSesion: null,
});

function renderPanel(closure?: { callerId: string }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UsersPanel closure={closure} />
      <ConfirmRoot />
    </QueryClientProvider>,
  );
}

const forbidden = (code: string) => new ApiError({ message: 'x', status: 403, kind: 'forbidden', code });

describe('staff closure in Usuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.users.mockResolvedValue({
      items: [row(admin, 'Ana Admin', 'ADMIN'), row(coach, 'Carlos Coach', 'COACH'), row(member, 'Sara Socia', 'CLIENTE')],
      total: 3,
      page: 1,
      totalPages: 1,
    });
  });
  afterEach(() => {
    if (confirmStore.getSnapshot()) confirmStore.resolveActive('dismiss');
  });

  it('offers «Cerrar cuenta» only on staff rows other than the admin looking', async () => {
    renderPanel({ callerId: admin });
    expect(await screen.findByRole('button', { name: 'Cerrar cuenta de Carlos Coach' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cerrar cuenta de Ana Admin/u })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cerrar cuenta de Sara Socia/u })).toBeNull();
  });

  it('offers nothing to a non-admin (no closure prop)', async () => {
    renderPanel();
    await screen.findByText('Carlos Coach');
    expect(screen.queryByRole('button', { name: /Cerrar cuenta/u })).toBeNull();
  });

  it('explains what is erased before closing, and closes only on confirm', async () => {
    mocks.close.mockResolvedValue({ closed: true, closedAt: '2026-11-16T12:00:00.000Z' });
    renderPanel({ callerId: admin });
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar cuenta de Carlos Coach' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('¿Cerrar la cuenta de Carlos Coach?');
    expect(within(dialog).getByText(staffClosureCopy.confirmMessage)).toBeInTheDocument();
    expect(mocks.close).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: staffClosureCopy.confirmLabel }));
    await waitFor(() => expect(mocks.close).toHaveBeenCalledWith(coach));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Cerramos la cuenta de Carlos Coach.'));
  });

  it.each([
    [forbidden('STAFF_CLOSURE_LAST_ADMIN'), staffClosureCopy.errors.STAFF_CLOSURE_LAST_ADMIN],
    [forbidden('STAFF_CLOSURE_SELF'), staffClosureCopy.errors.STAFF_CLOSURE_SELF],
    [new ApiError({ message: 'x', status: 400, kind: 'validation', code: 'STAFF_CLOSURE_NOT_STAFF' }), staffClosureCopy.errors.STAFF_CLOSURE_NOT_STAFF],
    [new ApiError({ message: 'No encontrado', status: 404, kind: 'not-found' }), staffClosureCopy.errors.notFound],
  ])('says the refusal by its code next to the row (%#)', async (error, message) => {
    mocks.close.mockRejectedValue(error);
    renderPanel({ callerId: admin });
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar cuenta de Carlos Coach' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: staffClosureCopy.confirmLabel }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
