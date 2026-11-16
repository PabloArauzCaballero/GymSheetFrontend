import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionPrincipal } from '@/shared/api/contracts';
import { NavigationList } from './nav-links';
import { TabBar } from './tab-bar';

const mocks = vi.hoisted(() => ({ counts: vi.fn() }));
vi.mock('@/features/interactions/services/interactions-service', () => ({
  interactionKeys: { counts: ['interactions', 'counts'] },
  interactionsService: { counts: mocks.counts },
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/comunidad' }));

const member = (emailVerified?: boolean): SessionPrincipal => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'socia@example.test',
  role: 'CLIENTE',
  ...(emailVerified === undefined ? {} : { emailVerified }),
});

function renderShellNav(session: SessionPrincipal) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NavigationList session={session} />
      <TabBar session={session} />
    </QueryClientProvider>,
  );
}

describe('shell interaction counter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.counts.mockResolvedValue({ likesReceived: 2, profileViewsNew: 1 });
  });

  it('does not ask the social API when the session email is unverified', async () => {
    renderShellNav(member(false));
    expect(await screen.findByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    // Let any pending query settle before asserting that none was issued.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.counts).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/novedades/u)).toBeNull();
  });

  it.each([true, undefined])('asks once and shows the alerts when emailVerified is %s', async (emailVerified) => {
    renderShellNav(member(emailVerified));
    expect((await screen.findAllByLabelText('3 novedades')).length).toBeGreaterThan(0);
    await waitFor(() => expect(mocks.counts).toHaveBeenCalledTimes(1));
  });
});
