'use client';

import { useQueryClient } from '@tanstack/react-query';
import { awardAnnouncement, pointsAwardDelta } from '@gymsheet/domain';
import { useEffect, useState } from 'react';
import type { ProfileCompletion } from '@/shared/api/schemas';

/** How long «+N» stays beside the points: long enough to read, short enough not to linger. */
const AWARD_VISIBLE_MS = 2600;
const COUNT_MS = 640;

export type PointsAward = { points: number; key: string; at: number };

// The award waiting for the hero (`apps/mobile/src/features/profile-hero/points-award.tsx`): the read that
// awards often happens on the edit page, and the profile shows it when the person comes back.
let unseen: PointsAward | null = null;
// Last `pointsEarned` seen per member in this session: a rise between two reads is an award.
const lastEarned = new Map<string, number>();

/**
 * Watches every completion read (profile and edit pages). An award is
 * `awardedNow` or a rise of `pointsEarned` since the last read (`pointsAwardDelta`):
 * once per award, the progression is re-read and the award is parked for the hero. Returns the line to announce
 * where it happened (an `aria-live` region renders it).
 */
export function useAwardDetector(completion: ProfileCompletion | undefined, userId: string | undefined): { text: string } | null {
  const queryClient = useQueryClient();
  const [announcement, setAnnouncement] = useState<{ text: string } | null>(null);
  useEffect(() => {
    if (!completion || !userId) return;
    const points = pointsAwardDelta(lastEarned.get(userId) ?? null, completion);
    lastEarned.set(userId, completion.pointsEarned);
    if (points <= 0) return;
    void queryClient.invalidateQueries({ queryKey: ['progression', 'me'] });
    unseen = { points, key: `${userId}@${completion.pointsEarned}`, at: Date.now() };
    const line = { text: awardAnnouncement(points) };
    // Not cancelled on cleanup: the award is counted once (lastEarned), so its line must not be lost.
    requestAnimationFrame(() => setAnnouncement(line));
  }, [completion, queryClient, userId]);
  return announcement;
}

/** The hero's side: takes the parked award, shows it for a few seconds and lets it go. No toast. */
export function usePointsAward(completion: ProfileCompletion | undefined, userId: string | undefined): { award: PointsAward | null; announcement: { text: string } | null } {
  const announcement = useAwardDetector(completion, userId);
  const [award, setAward] = useState<PointsAward | null>(null);
  useEffect(() => {
    if (!unseen) return;
    // Taken inside the frame, not in the effect body: a cancelled run (Strict Mode) leaves it parked.
    const show = requestAnimationFrame(() => {
      setAward(unseen);
      unseen = null;
    });
    return () => cancelAnimationFrame(show);
  }, [announcement]);
  useEffect(() => {
    if (!award) return;
    const hide = setTimeout(() => setAward(null), AWARD_VISIBLE_MS);
    return () => clearTimeout(hide);
  }, [award]);
  return { award, announcement };
}

/** Counts from `from` to `to` once (ease-out); with reduced motion it lands at once. */
export function useCountUp(to: number, from: number): number {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frame = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min((now - start) / COUNT_MS, 1);
      setValue(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, to]);
  return value;
}

/** The points figure during an award: counts up, with «+N» rising beside it. */
export function AwardedPoints({ value, award }: Readonly<{ value: number; award: PointsAward }>) {
  const shown = useCountUp(value, Math.max(value - award.points, 0));
  return (
    <span className="relative inline-block">
      {shown.toLocaleString('es-ES')}
      <span className="award-chip t-footnote absolute -top-4 -right-6 rounded-full bg-[var(--surface-highest)] px-2 py-0.5 font-semibold text-[var(--accent-ink)]" data-testid="profile-award-chip">
        {`+${award.points.toLocaleString('es-ES')}`}
      </span>
    </span>
  );
}

/** Polite live region for the award line. */
export function AwardAnnouncer({ line }: Readonly<{ line: { text: string } | null }>) {
  return (
    <p aria-live="polite" className="sr-only">
      {line?.text ?? ''}
    </p>
  );
}
