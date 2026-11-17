import type {} from '../../../../../web/node_modules/vitest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiError } from '@gymsheet/api-client';
import { DISCOVERY_PREFERENCES_REQUIRED } from '@gymsheet/domain';
import { DECK_SIZE, useDiscoveryDeck, type DeckFilters } from '../use-discovery-deck';

const { deck, swipe, undoSwipe, observeImpression, startConversation, push, notify, getDiscoveryPreferences } = vi.hoisted(() => ({
  deck: vi.fn(),
  getDiscoveryPreferences: vi.fn(),
  swipe: vi.fn(),
  undoSwipe: vi.fn(),
  observeImpression: vi.fn(),
  startConversation: vi.fn(),
  push: vi.fn(),
  notify: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/api/services', () => ({
  discoveryService: { deck, swipe, undoSwipe, observeImpression },
  chatService: { startConversation },
  socialService: { getDiscoveryPreferences },
}));
vi.mock('@/api/social-cache', () => ({ refreshSocialRelationship: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/notifications', () => ({ notify }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push }) }));

const card = (n: number, impressionId?: string) => ({
  userId: `00000000-0000-4000-8000-00000000000${n}`,
  impressionId,
  displayName: `Socio ${n}`,
  objetivo: null, branchId: null, branchName: null, connectionStatus: 'NONE', connectionId: null,
  socialStatus: null, photoUrl: null, photos: [], age: 30, gender: null, experienceLevel: null,
  points: null, levelCode: null, reasons: [], distanceKm: null,
});
const ana = card(1, '11111111-1111-4111-8111-111111111111');
const beto = card(2);

function renderDeck(filters: DeckFilters = { objetivos: [], sucursalId: null }, onUndone = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => useDiscoveryDeck(filters, { onUndone }), { wrapper }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  deck.mockResolvedValue([ana, beto]);
  getDiscoveryPreferences.mockResolvedValue({ configured: true, version: 1 });
  observeImpression.mockResolvedValue({ observed: true });
  swipe.mockResolvedValue({ direction: 'LIKE', targetId: ana.userId, matched: false, connectionId: null });
});

describe('useDiscoveryDeck', () => {
  it('requests the deck with goal and branch only: gender comes from saved preferences', async () => {
    const { result } = renderDeck({ objetivos: ['FUERZA', 'HIPERTROFIA'], sucursalId: 'branch-1' });
    await waitFor(() => expect(result.current.topCard?.userId).toBe(ana.userId));
    expect(deck).toHaveBeenCalledWith({ objetivo: 'FUERZA,HIPERTROFIA', sucursalId: 'branch-1', limit: DECK_SIZE });
    expect(deck.mock.calls[0]?.[0]).not.toHaveProperty('genero');
  });

  it('a LIKE removes the card at once, observes the impression and celebrates a match', async () => {
    swipe.mockResolvedValue({ direction: 'LIKE', targetId: ana.userId, matched: true, connectionId: 'c-1' });
    const { result } = renderDeck();
    await waitFor(() => expect(result.current.topCard).not.toBeNull());

    act(() => {
      expect(result.current.decide('LIKE')).toBe(true);
    });
    expect(result.current.topCard?.userId).toBe(beto.userId);
    await waitFor(() => expect(result.current.matchedEntry?.userId).toBe(ana.userId));
    expect(observeImpression).toHaveBeenCalledWith(ana.impressionId);
    expect(swipe).toHaveBeenCalledWith(ana.userId, 'LIKE', ana.impressionId);
    expect(result.current.hasDecisions).toBe(true);
  });

  it('a PASS sends PASS and never opens the match celebration', async () => {
    swipe.mockResolvedValue({ direction: 'PASS', targetId: ana.userId, matched: false, connectionId: null });
    const { result } = renderDeck();
    await waitFor(() => expect(result.current.topCard).not.toBeNull());

    act(() => {
      result.current.decide('PASS');
    });
    await waitFor(() => expect(swipe).toHaveBeenCalledWith(ana.userId, 'PASS', ana.impressionId));
    expect(result.current.topCard?.userId).toBe(beto.userId);
    expect(result.current.matchedEntry).toBeNull();
  });

  it('a swipe that never reached the server puts the card back on top', async () => {
    swipe.mockRejectedValue(new ApiError({ message: 'Sin conexión.', status: 0, kind: 'network' }));
    const { result } = renderDeck();
    await waitFor(() => expect(result.current.topCard).not.toBeNull());

    act(() => {
      result.current.decide('LIKE');
    });
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Sin conexión.'));
    expect(result.current.topCard?.userId).toBe(ana.userId);
    expect(result.current.hasDecisions).toBe(false);
  });

  it('a 409 swipe deals a fresh deck instead of restoring a card the server rejects', async () => {
    swipe.mockRejectedValue(new ApiError({ message: 'Ya decidiste.', status: 409, kind: 'conflict' }));
    const { result } = renderDeck();
    await waitFor(() => expect(result.current.topCard).not.toBeNull());
    deck.mockResolvedValue([beto]);

    act(() => {
      result.current.decide('LIKE');
    });
    await waitFor(() => expect(deck).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.topCard?.userId).toBe(beto.userId));
    expect(result.current.nextCard).toBeNull();
  });

  it('undo restores the card the server names and resets the card position', async () => {
    undoSwipe.mockResolvedValue({ targetId: ana.userId, unmatched: false });
    const onUndone = vi.fn();
    const { result } = renderDeck(undefined, onUndone);
    await waitFor(() => expect(result.current.topCard).not.toBeNull());
    act(() => {
      result.current.decide('PASS');
    });
    await waitFor(() => expect(result.current.swipePending).toBe(false));

    act(() => result.current.undo());
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Decisión deshecha.'));
    expect(result.current.topCard?.userId).toBe(ana.userId);
    expect(result.current.hasDecisions).toBe(false);
    expect(onUndone).toHaveBeenCalledTimes(1);
    expect(deck).toHaveBeenCalledTimes(1);
  });

  it('asks for discovery preferences instead of an error, and deals once they are saved', async () => {
    deck.mockRejectedValueOnce(
      new ApiError({ message: 'Faltan preferencias.', status: 400, kind: 'validation', code: DISCOVERY_PREFERENCES_REQUIRED }),
    );
    const { result } = renderDeck();
    await waitFor(() => expect(result.current.needsPreferences).toBe(true));
    expect(result.current.topCard).toBeNull();

    act(() => result.current.redeal());
    await waitFor(() => expect(result.current.topCard?.userId).toBe(ana.userId));
    expect(result.current.needsPreferences).toBe(false);
    expect(result.current.error).toBeNull();
  });
  it('deals a fresh hand when the saved preferences change elsewhere', async () => {
    const { client, result } = renderDeck();
    await waitFor(() => expect(result.current.topCard?.userId).toBe(ana.userId));
    act(() => {
      result.current.decide('PASS');
    });
    expect(result.current.topCard?.userId).toBe(beto.userId);

    // Perfil saved new preferences: the cached version moves and the deck re-deals.
    deck.mockResolvedValue([card(3), card(4)]);
    getDiscoveryPreferences.mockResolvedValue({ configured: true, version: 2 });
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['social', 'discovery-preferences'] });
    });
    await waitFor(() => expect(result.current.topCard?.userId).toBe(card(3).userId));
  });
});
