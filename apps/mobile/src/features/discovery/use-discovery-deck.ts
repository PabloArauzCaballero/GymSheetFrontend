import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GymDirectoryEntry, SwipeDirection } from '@gymsheet/schemas';
import { ApiError } from '@gymsheet/api-client';
import { needsDiscoveryPreferences } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { chatService, discoveryService, socialService } from '@/api/services';
import { refreshSocialRelationship } from '@/api/social-cache';
import { notify } from '@/notifications';

export const DECK_SIZE = 15;

/** Session filters. Gender is not one: saved discovery preferences are the single source. */
export type DeckFilters = { objetivos: readonly string[]; sucursalId: string | null };

type Decision = { entry: GymDirectoryEntry; direction: SwipeDirection; filterKey: string };

/**
 * The discovery deck: cards live in local state as well as in the cache, so a
 * decision removes the card at once and the mutation travels behind it. A failed
 * swipe puts the card back; a background refetch never replaces the hand.
 */
export function useDiscoveryDeck(
  { objetivos, sucursalId }: DeckFilters,
  { onUndone }: { onUndone?: () => void } = {},
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const objetivosKey = objetivos.slice().sort().join(',');
  // Saved preferences decide who is dealt; editing them elsewhere (Perfil) must
  // invalidate the hand, so their version is part of the deal's identity.
  const preferences = useQuery({
    queryKey: queryKeys.discoveryPreferences,
    queryFn: socialService.getDiscoveryPreferences,
  });
  const preferencesVersion = preferences.data?.version ?? 0;
  // Identity of the deal: when it changes, the hand on screen is no longer valid.
  const deckKey = `${objetivosKey}|${sucursalId ?? ''}|${preferencesVersion}`;
  const activeDeckKeyRef = useRef(deckKey);
  // Only accept a deal someone asked for (mount, filter change, retry, redeal).
  const acceptDealRef = useRef(true);
  const [cardsFilterKey, setCardsFilterKey] = useState(deckKey);
  const [cards, setCards] = useState<GymDirectoryEntry[]>([]);
  // Decided cards, most recent first: what undo can restore.
  const [decided, setDecided] = useState<Decision[]>([]);
  const [matchedEntry, setMatchedEntry] = useState<GymDirectoryEntry | null>(null);

  const deck = useQuery({
    queryKey: ['social', 'discovery', 'deck', objetivosKey, sucursalId ?? '', preferencesVersion],
    queryFn: () =>
      discoveryService.deck({
        objetivo: objetivos.length > 0 ? objetivos.join(',') : undefined,
        sucursalId: sucursalId || undefined,
        limit: DECK_SIZE,
      }),
    // Wait for the preferences version so the first hand is not dealt twice.
    enabled: !preferences.isPending,
    // A used deck is never cached: decided cards would come back and conflict.
    gcTime: 0,
    staleTime: 0,
  });
  const refetchDeck = deck.refetch;

  useLayoutEffect(() => {
    activeDeckKeyRef.current = deckKey;
  }, [deckKey]);

  useEffect(() => {
    acceptDealRef.current = true;
    setMatchedEntry(null);
  }, [deckKey]);

  useEffect(() => {
    if (!deck.data || !acceptDealRef.current) return;
    acceptDealRef.current = false;
    setCards(deck.data);
    setCardsFilterKey(deckKey);
  }, [deck.data, deck.dataUpdatedAt, deckKey]);

  const forget = (userId: string) =>
    setDecided((current) => current.filter((item) => item.entry.userId !== userId));

  const swipe = useMutation({
    mutationFn: async ({ entry, direction }: Decision) => {
      if (entry.impressionId) await discoveryService.observeImpression(entry.impressionId);
      return discoveryService.swipe(entry.userId, direction, entry.impressionId);
    },
    onSuccess: async (result, variables) => {
      if (variables.filterKey === activeDeckKeyRef.current && result.matched) setMatchedEntry(variables.entry);
      await refreshSocialRelationship(queryClient, { conversations: result.matched });
    },
    onError: async (error: Error, variables) => {
      notify.error(error.message);
      forget(variables.entry.userId);
      // 409: the server no longer considers this card a candidate; deal again.
      if (error instanceof ApiError && error.status === 409) {
        acceptDealRef.current = true;
        await Promise.all([refetchDeck(), refreshSocialRelationship(queryClient, { conversations: true })]);
        return;
      }
      if (variables.filterKey !== activeDeckKeyRef.current) return;
      // The decision never reached the server: the card goes back to the hand.
      setCards((current) =>
        current.some((card) => card.userId === variables.entry.userId) ? current : [variables.entry, ...current],
      );
      setCardsFilterKey(variables.filterKey);
    },
  });

  const undo = useMutation<Awaited<ReturnType<typeof discoveryService.undoSwipe>>, Error, { filterKey: string }>({
    mutationFn: () => discoveryService.undoSwipe(),
    onSuccess: async (result, variables) => {
      forget(result.targetId);
      if (variables.filterKey !== activeDeckKeyRef.current) {
        acceptDealRef.current = true;
        await Promise.all([refetchDeck(), refreshSocialRelationship(queryClient, { conversations: result.unmatched })]);
        return;
      }
      // The backend undoes its own last swipe: restore the card it names.
      const restored = decided.find((item) => item.entry.userId === result.targetId && item.filterKey === deckKey);
      if (restored) setCards((current) => [restored.entry, ...current]);
      else {
        acceptDealRef.current = true;
        await refetchDeck();
      }
      onUndone?.();
      await refreshSocialRelationship(queryClient, { conversations: result.unmatched });
      notify.success(result.unmatched ? 'Match deshecho.' : 'Decisión deshecha.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const message = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) => {
      setMatchedEntry(null);
      router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } });
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const visibleCards = cardsFilterKey === deckKey ? cards : [];
  const { mutate: mutateSwipe } = swipe;

  /** Closes a decision on the top card. Returns false when there is nothing valid to decide. */
  const decide = useCallback(
    (direction: SwipeDirection): boolean => {
      const entry = visibleCards[0];
      // An exit animation can finish after a filter change: never decide the new deck's card.
      if (deckKey !== activeDeckKeyRef.current || cardsFilterKey !== deckKey || !entry) return false;
      setCards((current) => current.slice(1));
      setDecided((current) => [{ entry, direction, filterKey: deckKey }, ...current]);
      mutateSwipe({ entry, direction, filterKey: deckKey });
      return true;
    },
    [cardsFilterKey, deckKey, mutateSwipe, visibleCards],
  );

  const dismissMatch = useCallback(() => setMatchedEntry(null), []);

  const redeal = useCallback(() => {
    acceptDealRef.current = true;
    void refetchDeck();
  }, [refetchDeck]);

  return {
    deckKey,
    isPending: deck.isPending,
    error: deck.isError ? deck.error : null,
    needsPreferences: deck.isError && needsDiscoveryPreferences(deck.error),
    topCard: visibleCards[0] ?? null,
    nextCard: visibleCards[1] ?? null,
    hasDecisions: decided.length > 0,
    swipePending: swipe.isPending,
    undoPending: undo.isPending,
    messagePending: message.isPending,
    matchedEntry,
    dismissMatch,
    decide,
    redeal,
    undo: () => undo.mutate({ filterKey: deckKey }),
    startConversation: (userId: string) => message.mutate(userId),
  };
}

export type DiscoveryDeck = ReturnType<typeof useDiscoveryDeck>;
