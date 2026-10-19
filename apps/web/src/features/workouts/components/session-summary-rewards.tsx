'use client';

import { streakSummary } from '@gymsheet/domain';
import { Flame } from 'lucide-react';
import { useMemo } from 'react';
import type { SessionReward } from '@/shared/api/schemas';
import {
  subjectTitle,
  type CelebrationSubject,
} from '@/features/progression/components/celebration/celebration-queue';
import { NearestBadges } from '@/features/progression/components/nearest-badges';
import { ChallengesList } from '@/features/progression/components/weekly-challenges';

/** «🔥 12 días · 1 comodín · ¡hito de 14!» bajo el total. Sin racha, nada. */
export function SessionStreakLine({ streak }: Readonly<{ streak: SessionReward['streak'] }>) {
  if (!streak || streak.current <= 0) return null;
  const text = streak.milestoneNow
    ? `${streakSummary(streak)} · ¡hito de ${streak.milestoneNow}!`
    : streakSummary(streak);
  return (
    <p className="flex items-center gap-2 text-sm tabular-nums text-[var(--text-muted)]">
      <Flame aria-hidden className="size-4 text-[var(--warning-text)]" />
      {text}
    </p>
  );
}

const PANEL =
  'grid gap-3 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5';

/**
 * Lo que viene tras el total, por la regla pico-final: los retos de la semana
 * (Zeigarnik: la barra a medio llenar es lo que trae de vuelta; lo cumplido en
 * esta sesión, «¡Hecho ahora!») y «Lo más cerca» (gradiente de meta).
 */
export function SessionRewardSections({ reward }: Readonly<{ reward: SessionReward }>) {
  const doneNow = useMemo(
    () => new Set(reward.challengesCompletedNow.map((item) => item.code)),
    [reward.challengesCompletedNow],
  );
  const week = reward.challenges;
  const nearest = reward.nearest.filter((badge) => !badge.earned);
  return (
    <>
      {week && week.items.length > 0 ? (
        <section aria-labelledby="session-challenges" className={PANEL}>
          <h2 className="text-base font-semibold text-[var(--text)]" id="session-challenges">
            Retos de la semana
          </h2>
          <ChallengesList highlight={doneNow} week={week} />
        </section>
      ) : null}
      {nearest.length > 0 ? (
        <section aria-labelledby="session-nearest" className={PANEL}>
          <h2 className="text-base font-semibold text-[var(--text)]" id="session-nearest">
            Lo más cerca
          </h2>
          <NearestBadges badges={nearest} limit={2} />
        </section>
      ) : null}
    </>
  );
}

/** «Te esperan 3 cartas»: qué hay en la cola antes de abrirla. */
export function PendingCardsLine({
  subjects,
}: Readonly<{ subjects: readonly CelebrationSubject[] }>) {
  if (subjects.length === 0) return null;
  return (
    <p className="text-center text-sm leading-6 text-[var(--text-muted)]">
      <span className="font-semibold text-[var(--text)]">
        {subjects.length === 1 ? 'Te espera una carta' : `Te esperan ${subjects.length} cartas`}
      </span>
      {`: ${subjects.map(subjectTitle).join(' · ')}`}
    </p>
  );
}
