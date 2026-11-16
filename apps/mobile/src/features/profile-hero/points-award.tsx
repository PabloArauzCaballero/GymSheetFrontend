import { useQueryClient } from '@tanstack/react-query';
import { awardAnnouncement, pointsAwardDelta } from '@gymsheet/domain';
import type { ProfileCompletion } from '@gymsheet/schemas';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { accentPolicy, colors, radii, spacing } from '@/theme';

/** How long the «+N» chip stays beside the points: long enough to read, short enough not to linger. */
const AWARD_VISIBLE_MS = 2600;

export type PointsAward = { points: number; key: string; at: number };

// The award waiting to be shown where the points live. Module state on purpose: the read that
// awards often happens on the edit screen, and the hero shows it when the person comes back.
let unseen: PointsAward | null = null;
// Last `pointsEarned` seen per member in this session: a rise between two reads is an award.
const lastEarned = new Map<string, number>();

/**
 * Watches every completion read (profile and edit screens). An award is
 * `awardedNow` or a rise of `pointsEarned` since the last read (`pointsAwardDelta`),
 * because any progression read on the server may be the one that grants it: a
 * success haptic and a spoken line right where it happened, the progression
 * re-read, and the award parked for the hero.
 */
export function useAwardDetector(completion: ProfileCompletion | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!completion || !userId) return;
    const points = pointsAwardDelta(lastEarned.get(userId) ?? null, completion);
    lastEarned.set(userId, completion.pointsEarned);
    if (points <= 0) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility(awardAnnouncement(points));
    void queryClient.invalidateQueries({ queryKey: ['progression', 'me'] });
    unseen = { points, key: `${userId}@${completion.pointsEarned}`, at: Date.now() };
  }, [completion, queryClient, userId]);
}

/**
 * The hero's side: takes the parked award when the profile is on screen, shows
 * it for a few seconds (the points count up, «+N» rises beside them) and lets
 * it go. No toast: the news is shown where the points live.
 */
export function usePointsAward(completion: ProfileCompletion | undefined, userId: string | undefined): PointsAward | null {
  useAwardDetector(completion, userId);
  const [award, setAward] = useState<PointsAward | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!unseen) return;
      // Taken inside the frame, not in the effect body: a cancelled run leaves it parked.
      const show = requestAnimationFrame(() => {
        setAward(unseen);
        unseen = null;
      });
      return () => cancelAnimationFrame(show);
    }, [completion?.pointsEarned]),
  );
  useEffect(() => {
    if (!award) return;
    const hide = setTimeout(() => setAward(null), AWARD_VISIBLE_MS);
    return () => clearTimeout(hide);
  }, [award]);
  return award;
}

/** «+50» beside the points figure: it rises in, holds, and fades. With Reduce Motion it simply appears. */
export function AwardChip({ points }: { points: number }) {
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.springify().damping(24).stiffness(220).withInitialValues({ transform: [{ translateY: 8 }] })}
      exiting={reduceMotion ? undefined : FadeOut.duration(180)}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ position: 'absolute', top: -spacing.md, right: -spacing.lg, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radii.full, backgroundColor: colors.surfaceHighest }}
      testID="profile-award-chip"
    >
      <Text style={{ color: accentPolicy.ink }} strong variant="footnote">{`+${points.toLocaleString('es-ES')}`}</Text>
    </Animated.View>
  );
}
