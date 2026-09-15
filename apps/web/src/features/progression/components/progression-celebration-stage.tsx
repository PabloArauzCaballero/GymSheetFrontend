'use client';

import {
  CARD_RARITY_LABEL,
  STILL_TIMELINE,
  cardTimeline,
  isCardRarity,
  seedFrom,
  shakeKeyframes,
  tierFor,
} from '@gymsheet/domain';
import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import type {
  BadgeRarity,
  ProgressionBadge,
  ProgressionLevel,
  SessionReward,
} from '@/shared/api/schemas';
import { CountUp } from '@/shared/components/motion/count-up';
import { CelebrationCard } from './celebration/celebration-card';
import {
  CelebrationFlash,
  CelebrationParticles,
  CelebrationRays,
} from './celebration/celebration-effects';
import { withAlpha } from './progression-colors';

/**
 * El escenario de la recompensa: la carta, lo que la rodea y lo que se lee.
 *
 * El guion —entrada de dorso, tensión, reventón, volteo, sello y texto— no se
 * decide aquí: sale de `@gymsheet/domain`, el mismo que usa el móvil. Aquí solo
 * se traduce a framer-motion y CSS.
 */

/** Lo que se celebra, ya normalizado: la escena no sabe de dónde viene. */
export type CelebrationSubject = Readonly<{
  kind: 'insignia' | 'nivel';
  name: string;
  /** Nombre de icono de Ionicons; `ProgressionIcon` lo traduce a lucide (SVG). */
  icon: string;
  color: string;
  flavor: string | null;
  rarity: BadgeRarity | null;
  /** Puntos que aporta. Nulo en un rango: el rango no suma, se alcanza. */
  points: number | null;
  /** Recién conseguida: lleva el sello «¡NUEVA!». Una revisita no lo lleva. */
  fresh: boolean;
}>;

export function badgeSubject(badge: ProgressionBadge, fresh = badge.isNew): CelebrationSubject {
  const { name, icon, color, rarity } = badge;
  const flavor = badge.flavorText ?? badge.description;
  return {
    kind: 'insignia',
    name,
    icon,
    color,
    rarity,
    flavor,
    points: badge.pointsReward > 0 ? badge.pointsReward : null,
    fresh,
  };
}

export function levelSubject(level: ProgressionLevel, fresh = false): CelebrationSubject {
  const { name, icon, color } = level;
  return {
    kind: 'nivel',
    name,
    icon,
    color,
    rarity: null,
    flavor: level.tagline,
    points: null,
    fresh,
  };
}

const RARITY_ORDER: Readonly<Record<BadgeRarity, number>> = {
  COMUN: 0,
  RARA: 1,
  EPICA: 2,
  LEGENDARIA: 3,
};

/**
 * La cola de cartas de una sesión, como se abre un cofre: de menos a más rara,
 * y el rango nuevo al final, porque es lo más grande que puede pasar.
 */
export function sessionRewardSubjects(reward: SessionReward): CelebrationSubject[] {
  const badges = [...reward.unlockedNow]
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity])
    .map((badge) => badgeSubject(badge, true));
  const level = reward.leveledUp && reward.levelAfter ? [levelSubject(reward.levelAfter, true)] : [];
  return [...badges, ...level];
}

export function celebrationHeading(subject: CelebrationSubject): string {
  return subject.kind === 'nivel' ? '¡Has subido de rango!' : '¡Insignia conseguida!';
}

export function celebrationAnnouncement(subject: CelebrationSubject): string {
  const rarity = isCardRarity(subject.rarity) ? ` Rareza: ${CARD_RARITY_LABEL[subject.rarity]}.` : '';
  const points = subject.points ? ` +${subject.points} puntos.` : '';
  return `${celebrationHeading(subject)} ${subject.name}.${rarity}${points}`;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const s = (ms: number) => ms / 1000;

/** Una línea del desenlace. Entra, pero nunca se escala: el texto no se estira. */
function Line(
  props: Readonly<{
    at: number;
    still: boolean;
    className: string;
    style?: CSSProperties;
    /** Para cifras que cuentan: el lector de pantalla oye el anuncio, no cada fotograma. */
    hidden?: boolean;
    children: ReactNode;
  }>,
) {
  const { at, still, className, style, hidden, children } = props;
  return (
    <motion.p
      animate={{ opacity: 1, y: 0 }}
      aria-hidden={hidden}
      className={className}
      initial={still ? false : { opacity: 0, y: 12 }}
      style={style}
      transition={still ? { duration: 0 } : { delay: s(at), duration: 0.36, ease: EASE_OUT }}
    >
      {children}
    </motion.p>
  );
}

/** La escena. El diálogo la remonta con `key` para repetir el guion. */
export function CelebrationStage({
  subject,
  still,
}: Readonly<{ subject: CelebrationSubject; still: boolean }>) {
  const tier = tierFor(subject.kind === 'nivel' ? null : subject.rarity);
  const timeline = still ? STILL_TIMELINE : cardTimeline(tier);
  const shake = shakeKeyframes(still ? 0 : tier.shake);
  const cue = (step: number) => timeline.text.at + step * timeline.text.step;
  const eyebrow =
    subject.kind === 'nivel'
      ? 'Nuevo rango'
      : isCardRarity(subject.rarity)
        ? `Insignia ${CARD_RARITY_LABEL[subject.rarity].toLowerCase()}`
        : 'Insignia';

  return (
    <motion.div
      animate={{ x: shake.x, y: shake.y }}
      className="relative flex w-full flex-col items-center gap-10"
      transition={
        still || tier.shake === 0
          ? { duration: 0 }
          : { delay: s(timeline.burst.at), duration: 0.45, ease: 'easeOut' }
      }
    >
      <div className="relative grid place-items-center">
        {still ? null : (
          <>
            <CelebrationRays tier={tier} timeline={timeline} />
            <CelebrationFlash timeline={timeline} />
            <CelebrationParticles seed={seedFrom(subject.name)} spread={260} tier={tier} timeline={timeline} />
          </>
        )}

        <CelebrationCard still={still} subject={subject} tier={tier} timeline={timeline} />

        {subject.fresh ? (
          <motion.span
            animate={{ opacity: 1, scale: 1, rotate: -8 }}
            aria-hidden
            className="pointer-events-none absolute -top-4 left-1/2 -ml-2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-black uppercase tracking-[0.08em] text-[rgb(var(--scrim-channels))]"
            initial={still ? false : { opacity: 0, scale: 1.6, rotate: -8 }}
            style={{
              background: `linear-gradient(180deg, ${tier.frame[0]}, ${tier.frame[1]})`,
              boxShadow: `0 8px 24px ${withAlpha(tier.glow, 0.6)}`,
            }}
            transition={
              still
                ? { duration: 0 }
                : { delay: s(timeline.stamp.at), type: 'spring', stiffness: 520, damping: 16, mass: 0.7 }
            }
          >
            {subject.kind === 'nivel' ? '¡Nuevo rango!' : '¡Nueva!'}
          </motion.span>
        ) : null}
      </div>

      <div className="grid max-w-sm gap-2 text-center">
        <Line
          at={cue(0)}
          className="text-xs font-semibold uppercase tracking-[0.18em]"
          still={still}
          style={{ color: tier.frame[0] }}
        >
          {eyebrow}
        </Line>
        <Line
          at={cue(1)}
          className="text-balance text-3xl font-semibold tracking-[-0.02em] text-[rgb(var(--sheen-channels))]"
          still={still}
        >
          {subject.name}
        </Line>
        {subject.flavor ? (
          <Line
            at={cue(2)}
            className="text-sm leading-6 text-[rgb(var(--sheen-channels)/0.72)]"
            still={still}
          >
            {subject.flavor}
          </Line>
        ) : null}
        {subject.points ? (
          <Line
            at={cue(3)}
            className="text-base font-semibold tabular-nums"
            hidden
            still={still}
            style={{ color: tier.glow }}
          >
            +<CountUp delayMs={still ? 0 : cue(3)} value={subject.points} /> puntos
          </Line>
        ) : null}
      </div>
    </motion.div>
  );
}
