import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComunidadClient } from './comunidad-client';

const { deck, readiness, getProfile } = vi.hoisted(() => ({
  deck: vi.fn(),
  readiness: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/features/social/services/discovery-service', () => ({
  discoveryService: { deck, swipe: vi.fn(), undoSwipe: vi.fn() },
}));
vi.mock('../services/social-profile-service', () => ({
  socialProfileKeys: { readiness: ['discovery-readiness'] },
  socialProfileService: { readiness },
}));
vi.mock('@/features/profile/services/profile-service', () => ({ profileService: { getProfile } }));
vi.mock('@/shared/notifications', () => ({ notify: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/features/verification/components/verification-cta', () => ({ VerificationCta: () => null }));
vi.mock('./search-preferences-dialog', () => ({ SearchPreferencesDialog: () => null }));
vi.mock('./discovery-preferences-card', () => ({ DiscoveryPreferencesCard: () => <form aria-label="Preferencias de Conocer" /> }));
vi.mock('./directory-swipe-deck', () => ({ DirectorySwipeDeck: () => <p>Baraja lista</p> }));
vi.mock('./match-celebration', () => ({ MatchCelebration: () => null }));
vi.mock('./member-detail-sheet', () => ({ MemberDetailSheet: () => null }));

function renderComunidad() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <ComunidadClient />
    </QueryClientProvider>,
  );
}

describe('ComunidadClient · the deck and the goal are only asked for when they can answer', () => {
  beforeEach(() => {
    deck.mockReset().mockResolvedValue([]);
    readiness.mockReset().mockResolvedValue({ ready: true, missing: [] });
    getProfile.mockReset().mockResolvedValue({ objetivo: 'FUERZA' });
  });

  it('shows the «a quién buscas» setup without requesting the deck while preferences are missing', async () => {
    readiness.mockResolvedValue({ ready: false, missing: ['PREFERENCES'] });
    renderComunidad();

    expect(await screen.findByRole('heading', { name: 'Cuéntanos a quién buscas' })).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Preferencias de Conocer' })).toBeTruthy();
    expect(deck).not.toHaveBeenCalled();
  });

  it('requests the deck once preferences exist, without asking for the body profile on «Para ti»', async () => {
    renderComunidad();

    await waitFor(() => expect(deck).toHaveBeenCalledTimes(1));
    expect(deck).toHaveBeenCalledWith({ objetivo: undefined, sucursalId: undefined, limit: 10 });
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('asks for the goal only on «Mismo objetivo» and deals the deck with it', async () => {
    renderComunidad();
    await waitFor(() => expect(deck).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('radio', { name: 'Mismo objetivo' }));

    await waitFor(() => expect(deck).toHaveBeenLastCalledWith({ objetivo: 'FUERZA', sucursalId: undefined, limit: 10 }));
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(deck).toHaveBeenCalledTimes(2);
  });

  it('still requests the deck when the readiness check itself fails', async () => {
    readiness.mockRejectedValue(new Error('network unavailable'));
    renderComunidad();

    await waitFor(() => expect(deck).toHaveBeenCalledTimes(1));
  });
});
