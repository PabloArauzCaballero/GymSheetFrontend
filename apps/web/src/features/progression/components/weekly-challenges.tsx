'use client';

import {
  CARD_TIERS,
  CHALLENGE_DIFFICULTY_LABEL,
  challengesSummary,
  weekCountdownLabel,
} from '@gymsheet/domain';
import { Check, Clock } from 'lucide-react';
import type { Challenge, WeeklyChallenges } from '@/shared/api/schemas';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/cn';
import { challengeRarity } from './celebration/celebration-queue';
import { MaterialCard, materialAccent } from './material-card';
import { withAlpha } from './progression-colors';
import { ProgressTrack } from './progression-track';

/**
 * Cuánto queda y cómo vas: «Quedan 3 días · 2 de 3 retos · los tres, +150
 * extra». Con los tres, «Semana redonda +150» en el oro de las cartas.
 */
export function ChallengesHeader({ week, now }: Readonly<{ week: WeeklyChallenges; now?: Date }>) {
  const gold = CARD_TIERS.LEGENDARIA.frame[1];
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
      <Clock aria-hidden className="size-3.5" />
      <span>{weekCountdownLabel(week.endsAt, now)}</span>
      <span aria-hidden>·</span>
      {week.perfect ? (
        <span
          className="rounded-full px-2 py-0.5 font-semibold tabular-nums text-[var(--text)]"
          style={{ backgroundColor: withAlpha(gold, 0.24) }}
        >
          {`${challengesSummary(week)} +${week.perfectBonus}`}
        </span>
      ) : (
        <>
          <span className="font-semibold tabular-nums text-[var(--text)]">
            {challengesSummary(week)}
          </span>
          <span>{`· los tres, +${week.perfectBonus} extra`}</span>
        </>
      )}
    </p>
  );
}

/**
 * Un reto: qué hacer, cuánto llevas y cuánto vale. La ficha y la barra llevan
 * el material de su carta (jade, zafiro, amatista); el acento de la marca se
 * queda para la acción de la pantalla. Cumplido y con `onOpen`, abre su carta.
 */
export function ChallengeCard({
  challenge,
  highlight = false,
  onOpen,
}: Readonly<{
  challenge: Challenge;
  /** Cumplido en esta misma sesión: borde marcado y «¡Hecho ahora!». */
  highlight?: boolean;
  onOpen?: (challenge: Challenge) => void;
}>) {
  const rarity = challengeRarity(challenge);
  const accent = materialAccent(rarity);
  const done = challenge.completed;
  const difficulty = CHALLENGE_DIFFICULTY_LABEL[challenge.difficulty];
  const shell = cn(
    'grid content-start gap-3 rounded-2xl border bg-[var(--surface-low)] p-4 text-left',
    onOpen && done ? 'hover-lift pressable cursor-pointer' : '',
  );
  const style = {
    borderColor: done ? withAlpha(accent, highlight ? 0.85 : 0.4) : 'var(--border-subtle)',
  };

  const body = (
    <>
      <div className="flex items-start gap-3">
        <MaterialCard
          icon={done ? 'checkmark' : challenge.icon}
          rarity={rarity}
          shape="glyph"
          size={40}
        />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-semibold leading-5 text-[var(--text)]">
            {challenge.title}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{`${difficulty} · +${challenge.pointsReward} pts`}</span>
        </div>
        {done ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-[var(--text)]"
            style={{ backgroundColor: withAlpha(accent, 0.24) }}
          >
            <Check aria-hidden className="size-3" />
            {highlight ? '¡Hecho ahora!' : 'Hecho'}
          </span>
        ) : null}
      </div>
      <div className="grid gap-1.5">
        <ProgressTrack
          color={accent}
          height={6}
          label={`Avance del reto ${challenge.title}`}
          ratio={challenge.progress}
        />
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="min-w-0 truncate text-[var(--text-muted)]">{challenge.description}</span>
          <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
            {challenge.progressLabel}
          </span>
        </div>
      </div>
    </>
  );

  if (onOpen && done) {
    return (
      <button
        aria-label={`${challenge.title}. Cumplido. Ver su carta`}
        className={shell}
        onClick={() => onOpen(challenge)}
        style={style}
        type="button"
      >
        {body}
      </button>
    );
  }
  return (
    <article className={shell} style={style}>
      {body}
    </article>
  );
}

/** Los tres retos con su cabecera. */
export function ChallengesList({
  week,
  highlight,
  onOpen,
  columns = false,
}: Readonly<{
  week: WeeklyChallenges;
  /** Códigos cumplidos en esta sesión. */
  highlight?: ReadonlySet<string>;
  onOpen?: (challenge: Challenge) => void;
  /** En la senda, tres columnas en escritorio; en el resumen, apilados. */
  columns?: boolean;
}>) {
  return (
    <div className="grid gap-3">
      <ChallengesHeader week={week} />
      <div className={cn('grid gap-3', columns ? 'md:grid-cols-3' : '')}>
        {week.items.map((challenge) => (
          <ChallengeCard
            challenge={challenge}
            highlight={highlight?.has(challenge.code) ?? false}
            key={challenge.code}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

/** «Retos de la semana» en la senda: la segunda cosa que se lee, tras el rango. */
export function ChallengesCard({
  week,
  onOpen,
}: Readonly<{ week: WeeklyChallenges; onOpen: (challenge: Challenge) => void }>) {
  return (
    <Card data-tutorial-id="progression:challenges">
      <CardHeader
        description="Tres retos a tu medida, nuevos cada lunes. Cumple los tres y la semana es redonda."
        title="Retos de la semana"
      />
      <CardContent>
        <ChallengesList columns onOpen={onOpen} week={week} />
      </CardContent>
    </Card>
  );
}
