'use client';

import { STILL_TIMELINE, cardTimeline, shakeKeyframes } from '@gymsheet/domain';
import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { CountUp } from '@/shared/components/motion/count-up';
import { CelebrationCard } from './celebration/celebration-card';
import type { CardScene } from './celebration/celebration-scene';
import {
  CelebrationFlash,
  CelebrationParticles,
  CelebrationRays,
} from './celebration/celebration-effects';
import { withAlpha } from './progression-colors';
import { PrizeCode } from './prize-code';

/**
 * El escenario de la recompensa: la carta, lo que la rodea y lo que se lee.
 *
 * El guion —entrada de dorso, tensión, reventón, volteo, sello y texto— no se
 * decide aquí: sale de `@gymsheet/domain`, el mismo que usa el móvil. Aquí solo
 * se traduce a framer-motion y CSS.
 */

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
export function CelebrationStage({ scene, still }: Readonly<{ scene: CardScene; still: boolean }>) {
  const { tier } = scene;
  const timeline = still ? STILL_TIMELINE : cardTimeline(tier);
  const shake = shakeKeyframes(still ? 0 : tier.shake);
  const cue = (step: number) => timeline.text.at + step * timeline.text.step;

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
            <CelebrationParticles seed={scene.seed} spread={260} tier={tier} timeline={timeline} />
          </>
        )}

        <CelebrationCard scene={scene} still={still} tier={tier} timeline={timeline} />

        {scene.stamp ? (
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
                : {
                    delay: s(timeline.stamp.at),
                    type: 'spring',
                    stiffness: 520,
                    damping: 16,
                    mass: 0.7,
                  }
            }
          >
            {scene.stamp}
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
          {scene.eyebrow}
        </Line>
        <Line
          at={cue(1)}
          className="text-balance text-3xl font-semibold tracking-[-0.02em] text-[rgb(var(--sheen-channels))]"
          still={still}
        >
          {scene.title}
        </Line>
        {scene.code ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="justify-self-center"
            initial={still ? false : { opacity: 0, y: 12 }}
            transition={
              still ? { duration: 0 } : { delay: s(cue(2)), duration: 0.36, ease: EASE_OUT }
            }
          >
            <PrizeCode code={scene.code} size="lg" tone="stage" />
          </motion.div>
        ) : null}
        {scene.flavor ? (
          <Line
            at={cue(2)}
            className="text-sm leading-6 text-[rgb(var(--sheen-channels)/0.72)]"
            still={still}
          >
            {scene.flavor}
          </Line>
        ) : null}
        {scene.points ? (
          <Line
            at={cue(3)}
            className="text-base font-semibold tabular-nums"
            hidden
            still={still}
            style={{ color: tier.glow }}
          >
            +<CountUp delayMs={still ? 0 : cue(3)} value={scene.points} /> puntos
          </Line>
        ) : null}
      </div>
    </motion.div>
  );
}
