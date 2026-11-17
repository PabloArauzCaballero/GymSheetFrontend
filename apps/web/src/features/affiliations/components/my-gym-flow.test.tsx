import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MyGym } from '@/shared/api/schemas';
import { LeaderboardCard } from '@/features/progression/components/progression-secondary-cards';
import { MyGymCard } from './person/my-gym-card';

vi.mock('@/shared/notifications', () => ({ confirm: vi.fn(), notify: { success: vi.fn(), error: vi.fn() } }));

const GYM = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const AFF = '0190e2cb-a6d4-7ec3-8f91-a6c735631503';
const none: MyGym = { status: 'NONE', gym: null, location: null, since: null, affiliationId: null, pendingRequest: null, membershipVisible: true };

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe('«Mi gimnasio»', () => {
  it('explains NONE with a way to find the gym', () => {
    wrap(<MyGymCard myGym={none} />);
    expect(screen.getByRole('link', { name: 'Buscar mi gimnasio' }).getAttribute('href')).toBe('/marketplace?categoria=gyms');
  });

  it('shows «Solicitud enviada a X» while the gym decides', () => {
    wrap(
      <MyGymCard
        myGym={{ ...none, status: 'REQUESTED', pendingRequest: { affiliationId: AFF, gym: { id: GYM, name: 'Top Fitness', handle: 'topfitness', logoUrl: null }, location: null, requestedAt: '2026-11-17T10:00:00.000Z', switchesGym: false } }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Solicitud enviada a Top Fitness' })).toBeTruthy();
  });

  // Replaces the tenant ranking: without a confirmed SOCIO the 403 is a state with its next step.
  it('shows the ranking gate instead of an empty table', () => {
    wrap(<LeaderboardCard entries={[]} gate="NONE" onSortChange={vi.fn()} sortBy="points" />);
    expect(screen.getByText('Únete a tu gimnasio')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Puntos' })).toBeNull();
    expect(screen.queryByText('Todavía no hay nadie en la tabla. Entrena y sé el primero.')).toBeNull();
  });
});
