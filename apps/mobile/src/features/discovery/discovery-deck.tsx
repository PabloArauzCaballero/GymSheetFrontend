import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';
import type { GymDirectoryEntry, SwipeDirection } from '@gymsheet/schemas';
import { profilePhotosService } from '@/api/services';
import { ErrorState } from '@/components/feedback';
import { ProfileDetailSheet } from '@/components/profile-detail-sheet';
import { useAuthStore } from '@/state/auth-store';
import { spacing } from '@/theme';
import { DeckActions } from './deck-actions';
import { DeckEmpty, DeckLoading, DeckPreferencesRequired } from './deck-states';
import { MatchModal } from './match-modal';
import { NextCard } from './next-card';
import { SwipeCard } from './swipe-card';
import { useCardOffset, useDeckGestures } from './use-deck-gestures';
import { useDiscoveryDeck, type DeckFilters } from './use-discovery-deck';

/** The one discovery deck of the app: stage, action bar, profile sheet and match celebration. */
export function DiscoveryDeck({ filters, onOpenFilters }: { filters: DeckFilters; onOpenFilters: () => void }) {
  const { width } = useWindowDimensions();
  const reduceMotion = Boolean(useReducedMotion());
  const principal = useAuthStore((state) => state.principal);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [detailEntry, setDetailEntry] = useState<GymDirectoryEntry | null>(null);
  const offset = useCardOffset();
  const deck = useDiscoveryDeck(filters, { onUndone: offset.reset });
  const { topCard, nextCard, matchedEntry } = deck;

  const myPhotos = useQuery({
    queryKey: ['profile', 'photos'],
    queryFn: () => profilePhotosService.list(),
    staleTime: 60_000,
  });

  useEffect(() => setDetailEntry(null), [deck.deckKey]);

  const { decide } = deck;
  const commit = useCallback(
    (direction: SwipeDirection) => {
      offset.reset();
      if (decide(direction) && !reduceMotion) {
        void Haptics.impactAsync(direction === 'LIKE' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [decide, offset, reduceMotion],
  );
  const openDetail = useCallback(() => setDetailEntry(topCard), [topCard]);

  const motion = useDeckGestures({
    offset,
    topCard,
    enabled: Boolean(topCard) && !matchedEntry,
    width,
    reduceMotion,
    stage,
    onCommit: commit,
    onOpenDetail: openDetail,
  });

  return (
    <>
      <View
        onLayout={(event) => {
          const { width: measured, height } = event.nativeEvent.layout;
          setStage((current) => (current.width === measured && current.height === height ? current : { width: measured, height }));
        }}
        style={{ flex: 1, paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.xs, alignItems: 'center', justifyContent: 'center' }}
      >
        {deck.isPending ? (
          <DeckLoading />
        ) : deck.needsPreferences ? (
          <DeckPreferencesRequired onSaved={deck.redeal} />
        ) : deck.error ? (
          <View style={{ flex: 1, width: '100%', justifyContent: 'center', padding: spacing.lg }}>
            <ErrorState error={deck.error} onRetry={deck.redeal} />
          </View>
        ) : topCard ? (
          <View style={{ width: '100%', height: '100%', position: 'relative' }}>
            {nextCard ? <NextCard entry={nextCard} style={motion.nextCardStyle} /> : null}
            <SwipeCard
              entry={topCard}
              gesture={motion.gesture}
              onOpenDetail={openDetail}
              photoCount={motion.photoCount}
              photoIndex={motion.photoIndex}
              style={motion.cardStyle}
              threshold={motion.threshold}
              translateX={offset.translateX}
            />
          </View>
        ) : (
          <DeckEmpty onOpenFilters={onOpenFilters} onRedeal={deck.redeal} />
        )}
      </View>

      {/* Actions only with a card in front: without one there is nothing to undo, pass or like. */}
      {topCard ? (
        <DeckActions
          canUndo={deck.hasDecisions}
          messagePending={deck.messagePending}
          onDecide={motion.flyOut}
          onMessage={() => deck.startConversation(topCard.userId)}
          onUndo={deck.undo}
          swipePending={deck.swipePending}
          undoPending={deck.undoPending}
        />
      ) : (
        // Reserves the floating tab bar height so nothing sits under the glass.
        <View style={{ height: 84 }} />
      )}

      <ProfileDetailSheet entry={detailEntry} onClose={() => setDetailEntry(null)} />
      <MatchModal
        matchedEntry={matchedEntry}
        messaging={deck.messagePending}
        myName={principal?.nombreCompleto ?? 'Tú'}
        myPhotoUrl={myPhotos.data?.[0]?.url ?? null}
        onClose={deck.dismissMatch}
        onMessage={() => {
          if (matchedEntry) deck.startConversation(matchedEntry.userId);
        }}
        reduceMotion={reduceMotion}
      />
    </>
  );
}
