import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { GymDirectoryEntry, SwipeDirection } from '@gymsheet/schemas';

const DECISION_RATIO = 0.28;
const FLING_VELOCITY = 900;
const MAX_ROTATION_DEG = 12;
const EXIT_MS = 220;
const CARD_SPRING = { damping: 24, stiffness: 260, mass: 0.6, overshootClamping: true } as const;
// The left third steps back through photos; the rest steps forward.
const BACK_ZONE_RATIO = 1 / 3;
const TAP_MAX_MS = 260;
// Taps on the bottom info block (name, chips, chevron) open the full profile.
const INFO_ZONE_HEIGHT = 180;

/** Card offset shared by the gesture, the stamps and the undo reset. */
export function useCardOffset() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const reset = useCallback(() => {
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);
  useEffect(
    () => () => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    },
    [translateX, translateY],
  );
  return { translateX, translateY, reset };
}

export type CardOffset = ReturnType<typeof useCardOffset>;

type Options = {
  offset: CardOffset;
  topCard: GymDirectoryEntry | null;
  enabled: boolean;
  width: number;
  reduceMotion: boolean;
  stage: { width: number; height: number };
  onCommit: (direction: SwipeDirection) => void;
  onOpenDetail: () => void;
};

/** Drag-to-decide, tap-through-photos and the animated styles of the two stacked cards. */
export function useDeckGestures({ offset, topCard, enabled, width, reduceMotion, stage, onCommit, onOpenDetail }: Options) {
  const { translateX, translateY } = offset;
  const threshold = width * DECISION_RATIO;
  const topCardId = topCard?.userId ?? null;
  const photoCount = topCard ? Math.max(topCard.photos.length, topCard.photoUrl ? 1 : 0) : 0;
  // The cursor is bound to its card, so a new card always derives its cover on first paint.
  const [photoCursor, setPhotoCursor] = useState<{ cardId: string | null; index: number }>({ cardId: null, index: 0 });
  const photoIndex = photoCursor.cardId === topCardId ? photoCursor.index : 0;

  const stepPhoto = useCallback(
    (delta: number) => {
      setPhotoCursor((current) => {
        const next = (current.cardId === topCardId ? current.index : 0) + delta;
        if (next < 0 || next >= photoCount) return current;
        return { cardId: topCardId, index: next };
      });
    },
    [photoCount, topCardId],
  );

  /** Animated exit for the action buttons; a hard cut with reduced motion. */
  const flyOut = useCallback(
    (direction: SwipeDirection) => {
      if (reduceMotion) {
        onCommit(direction);
        return;
      }
      translateX.value = withTiming(
        (direction === 'LIKE' ? 1 : -1) * width * 1.4,
        { duration: EXIT_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(onCommit)(direction);
        },
      );
    },
    [onCommit, reduceMotion, translateX, width],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .onBegin(() => {
          cancelAnimation(translateX);
          cancelAnimation(translateY);
        })
        .onUpdate((event) => {
          translateX.value = event.translationX;
          translateY.value = event.translationY;
        })
        .onEnd((event) => {
          const resolved = Math.abs(event.translationX) > threshold || Math.abs(event.velocityX) > FLING_VELOCITY;
          if (!resolved) {
            translateX.value = withSpring(0, CARD_SPRING);
            translateY.value = withSpring(0, CARD_SPRING);
            return;
          }
          const direction: SwipeDirection = event.translationX > 0 ? 'LIKE' : 'PASS';
          if (reduceMotion) {
            runOnJS(onCommit)(direction);
            return;
          }
          translateY.value = withTiming(event.translationY, { duration: EXIT_MS });
          translateX.value = withTiming(
            (direction === 'LIKE' ? 1 : -1) * width * 1.4,
            { duration: EXIT_MS, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) runOnJS(onCommit)(direction);
            },
          );
        }),
    [enabled, onCommit, reduceMotion, threshold, translateX, translateY, width],
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enabled)
        .maxDuration(TAP_MAX_MS)
        .onEnd((event, success) => {
          if (!success) return;
          // Without a measured stage there is no frame of reference for the tap.
          if (stage.width <= 0 || stage.height <= 0) return;
          if (event.y >= stage.height - INFO_ZONE_HEIGHT) {
            runOnJS(onOpenDetail)();
            return;
          }
          if (photoCount < 2) return;
          runOnJS(stepPhoto)(event.x < stage.width * BACK_ZONE_RATIO ? -1 : 1);
        }),
    [enabled, onOpenDetail, photoCount, stage.height, stage.width, stepPhoto],
  );

  // Dragging wins; a tap only counts when the pan never activated.
  const gesture = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: reduceMotion ? '0deg' : `${(translateX.value / width) * MAX_ROTATION_DEG}deg` },
    ],
  }));

  // The card behind grows and brightens as the top one leaves.
  const nextCardStyle = useAnimatedStyle(() => {
    const progress = reduceMotion ? 0 : Math.min(Math.abs(translateX.value) / threshold, 1);
    return { transform: [{ scale: 0.94 + progress * 0.06 }], opacity: 0.65 + progress * 0.35 };
  });

  return { gesture, flyOut, cardStyle, nextCardStyle, threshold, photoIndex, photoCount };
}
