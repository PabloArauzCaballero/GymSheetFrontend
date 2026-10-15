import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { directoryKeys } from '@/features/social/services/directory-keys';
import { interactionsService } from '@/features/interactions/services/interactions-service';
import { PassesPanel } from './passes-panel';

vi.mock('@/features/interactions/services/interactions-service', () => ({
  interactionKeys: {
    passesReceived: ['interactions', 'passes', 'received'],
    passesSent: ['interactions', 'passes', 'sent'],
    counts: ['interactions', 'counts'],
  },
  interactionsService: {
    passesReceived: vi.fn(),
    passesSent: vi.fn(),
    undoPass: vi.fn(),
  },
}));
vi.mock('@/features/social/components/member-profile-dialog', () => ({ MemberProfileDialog: () => null }));
vi.mock('@/shared/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const pass = {
  userId: '00000000-0000-4000-8000-000000000020',
  displayName: 'Socio descartado',
  objetivo: 'TRAINING',
  branchId: null,
  branchName: null,
  connectionStatus: 'NONE' as const,
  connectionId: null,
  socialStatus: null,
  photoUrl: null,
  photos: [],
  age: 28,
  gender: 'FEMALE' as const,
  experienceLevel: 'BEGINNER' as const,
  points: 0,
  levelCode: null,
  passedAt: '2026-10-09T12:00:00.000Z',
};

describe('PassesPanel undo cache synchronization', () => {
  beforeEach(() => {
    vi.mocked(interactionsService.passesReceived).mockResolvedValue([]);
    vi.mocked(interactionsService.passesSent).mockResolvedValue([pass]);
    vi.mocked(interactionsService.undoPass).mockResolvedValue({ undone: true } as never);
  });

  it('refreshes the actual discovery deck after undoing a pass', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    render(
      <QueryClientProvider client={queryClient}>
        <PassesPanel counts={null} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Di next' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Devolver a la baraja' }));

    await waitFor(() => expect(interactionsService.undoPass).toHaveBeenCalledWith(pass.userId));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: directoryKeys.all }));
  });
});
