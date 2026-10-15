import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/shared/api/query-keys';
import { directoryKeys } from '@/features/social/services/directory-keys';
import { socialService } from '@/features/social/services/social-service';
import { RequestsTab } from './requests-tab';

vi.mock('@/features/social/services/social-service', () => ({
  socialService: {
    listConnections: vi.fn(),
    respondConnection: vi.fn(),
    withdrawConnection: vi.fn(),
  },
}));
vi.mock('@/shared/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const received = {
  id: '00000000-0000-4000-8000-000000000010',
  otherUserId: '00000000-0000-4000-8000-000000000011',
  otherUserName: 'Socio de prueba',
  direction: 'RECEIVED' as const,
  status: 'PENDING' as const,
  createdAt: '2026-10-09T12:00:00.000Z',
};
const sent = {
  ...received,
  id: '00000000-0000-4000-8000-000000000012',
  direction: 'SENT' as const,
};

function renderRequests() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <RequestsTab />
    </QueryClientProvider>,
  );
  return invalidate;
}

describe('RequestsTab connection cache synchronization', () => {
  beforeEach(() => {
    vi.mocked(socialService.listConnections).mockResolvedValue([received]);
    vi.mocked(socialService.respondConnection).mockResolvedValue({} as never);
  });

  it('refreshes directory, connection and chat views after accepting a request', async () => {
    const invalidate = renderRequests();
    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar' }));

    await waitFor(() => expect(socialService.respondConnection).toHaveBeenCalledWith(received.id, 'ACCEPT'));
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.connections });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: directoryKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.conversations });
  });

  it('withdraws a sent request and refreshes relationship views without creating chat', async () => {
    vi.mocked(socialService.listConnections).mockResolvedValue([sent]);
    vi.mocked(socialService.withdrawConnection).mockResolvedValue({} as never);
    const invalidate = renderRequests();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar invitación de conexión' }));

    await waitFor(() => expect(socialService.withdrawConnection).toHaveBeenCalledWith(sent.id));
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.connections });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: directoryKeys.all });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: queryKeys.conversations });
  });
});
