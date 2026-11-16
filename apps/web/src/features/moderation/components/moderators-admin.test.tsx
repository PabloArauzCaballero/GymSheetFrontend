import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmStore } from '@gymsheet/notifications';
import { MODERATOR_NOT_ASSIGNABLE, moderatorsCopy } from '@gymsheet/domain';
import { ApiError } from '@/shared/api/api-error';
import { ConfirmRoot } from '@/shared/notifications';
import { ModeratorsAdmin } from './moderators-admin';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  assign: vi.fn(),
  revoke: vi.fn(),
  users: vi.fn(),
  success: vi.fn(),
}));
vi.mock('@/features/moderation/services/platform-moderators-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/moderation/services/platform-moderators-service')>()),
  platformModeratorsService: { list: mocks.list, assign: mocks.assign, revoke: mocks.revoke },
}));
vi.mock('@/features/admin/services/insights-service', () => ({ insightsService: { users: mocks.users } }));
vi.mock('@/shared/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/notifications')>()),
  notify: { success: mocks.success, error: vi.fn() },
}));

const moderatorId = '00000000-0000-4000-8000-0000000000a1';
const memberId = '00000000-0000-4000-8000-0000000000d1';
const moderator = { id: moderatorId, email: 'mia@example.com', nombreCompleto: 'Mía Moderadora', estado: 'ACTIVO' };
const member = {
  id: memberId,
  nombreCompleto: 'Sara Socia',
  email: 'sara@example.com',
  rol: 'CLIENTE',
  estado: 'ACTIVO',
  tenantId: 'default',
  telefono: null,
  plan: null,
  venceEl: null,
  vigente: true,
  ultimaSesion: null,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ModeratorsAdmin />
      <ConfirmRoot />
    </QueryClientProvider>,
  );
}

async function pickSara() {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar socio por correo o nombre' }), {
    target: { value: 'sara@' },
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Sumar a Sara Socia' }));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveAccessibleName(moderatorsCopy.addTitle('Sara Socia'));
  fireEvent.click(within(dialog).getByRole('button', { name: moderatorsCopy.addLabel }));
}

describe('ModeratorsAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([moderator]);
    mocks.users.mockResolvedValue({ items: [member], total: 1, page: 1, pageSize: 20 });
  });
  afterEach(() => {
    if (confirmStore.getSnapshot()) confirmStore.resolveActive('dismiss');
  });

  it('lists the team and searches only member accounts', async () => {
    renderPage();
    const team = await screen.findByRole('list', { name: 'Equipo de moderación' });
    expect(within(team).getByText('Mía Moderadora')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar socio por correo o nombre' }), {
      target: { value: 'sara@' },
    });
    await screen.findByText('Sara Socia');
    expect(mocks.users).toHaveBeenCalledWith('sara@', 1, 20, 'CLIENTE');
  });

  it('adds a member only after confirming', async () => {
    mocks.assign.mockResolvedValue({ id: memberId, email: member.email, nombreCompleto: 'Sara Socia', estado: 'ACTIVO' });
    renderPage();
    await screen.findByText('Mía Moderadora');
    await pickSara();
    await waitFor(() => expect(mocks.assign).toHaveBeenCalledWith(memberId));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith(moderatorsCopy.added('Sara Socia')));
  });

  it('removes a moderator only after confirming', async () => {
    mocks.revoke.mockResolvedValue(null);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar a Mía Moderadora' }));
    const dialog = await screen.findByRole('dialog');
    expect(mocks.revoke).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: moderatorsCopy.removeLabel }));
    await waitFor(() => expect(mocks.revoke).toHaveBeenCalledWith(moderatorId));
  });

  it.each([
    [
      new ApiError({ message: 'x', status: 409, kind: 'conflict', code: MODERATOR_NOT_ASSIGNABLE }),
      moderatorsCopy.errors[MODERATOR_NOT_ASSIGNABLE],
    ],
    [new ApiError({ message: 'x', status: 404, kind: 'not-found' }), moderatorsCopy.errors.addNotFound],
  ])('says the refusal by its code (%#)', async (error, message) => {
    mocks.assign.mockRejectedValue(error);
    renderPage();
    await screen.findByText('Mía Moderadora');
    await pickSara();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
