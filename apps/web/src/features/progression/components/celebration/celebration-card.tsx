'use client';

import {
  CARD_PERSPECTIVE,
  prizeCodeGroups,
  wobbleKeyframes,
  type CardTier,
  type CardTimeline,
} from '@gymsheet/domain';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react';
import { CountUp } from '@/shared/components/motion/count-up';
import { withAlpha } from '../progression-colors';
import { ProgressionIcon } from '../progression-icon';
import { CardBack, frameGradient } from './celebration-card-back';
import type { CardScene } from './celebration-scene';

/**
 * La carta: un objeto con dos caras.
 *
 * Entra de dorso, tiembla, y se voltea en el instante del reventón. El volteo es
 * un `rotateY` real con `preserve-3d` y caras con `backface-visibility: hidden`:
 * a mitad de giro la carta tiene canto, que es lo que la hace sentirse objeto y
 * no una imagen que cambia.
 *
 * Cinco capas anidadas, cada una con un solo trabajo —entrada, inclinación con
 * el puntero, temblor, volteo, caras— para que ninguna animación pise el
 * `transform` de otra.
 */

const s = (ms: number) => ms / 1000;
const TILT_MAX = 8;
const TILT_SPRING = { stiffness: 220, damping: 22, mass: 0.6 };

/**
 * Iridiscencia de la legendaria. Sale de los colores de la propia carta —marco,
 * brillo y el color de la insignia— y no de un arcoíris fijo: los colores son
 * del catálogo y del tema, nunca literales en código.
 */
function holoIridescent(scene: CardScene, tier: CardTier): string {
  const stop = (hex: string) => withAlpha(hex, 0.3);
  return `linear-gradient(110deg, transparent 22%, ${stop(scene.tint)} 36%, ${stop(tier.frame[0])} 44%, rgb(var(--sheen-channels) / 0.34) 50%, ${stop(tier.glow)} 56%, ${stop(scene.tint)} 62%, transparent 74%)`;
}
const HOLO_SOFT =
  'linear-gradient(110deg, transparent 30%, rgb(var(--sheen-channels) / 0.34) 46%, transparent 62%)';

function CardFront({
  scene,
  tier,
  still,
  timeline,
}: Readonly<{ scene: CardScene; tier: CardTier; still: boolean; timeline: CardTimeline }>) {
  const { label } = scene;
  return (
    <div
      className="absolute inset-0 rounded-[22px] p-[6px] [backface-visibility:hidden] [transform:rotateY(180deg)]"
      style={{
        background: frameGradient(tier),
        boxShadow: `0 28px 80px ${withAlpha(tier.glow, 0.5)}`,
      }}
    >
      <div
        className="relative flex size-full flex-col overflow-hidden rounded-[17px]"
        style={{
          backgroundColor: 'rgb(var(--scrim-channels))',
          backgroundImage: `radial-gradient(circle at 50% 36%, ${withAlpha(scene.tint, 0.45)} 0%, ${withAlpha(scene.tint, 0.12)} 42%, transparent 70%)`,
        }}
      >
        <div className="grid flex-1 place-items-center">
          <ProgressionIcon
            className="size-24"
            name={scene.icon}
            style={{
              color: scene.tint,
              filter: `drop-shadow(0 0 16px ${withAlpha(scene.tint, 0.85)})`,
            }}
          />
        </div>
        <div
          className="grid gap-1 border-t px-4 pb-4 pt-3 text-center"
          style={{
            borderColor: withAlpha(tier.frame[1], 0.45),
            background: withAlpha(tier.frame[2], 0.35),
          }}
        >
          {label ? (
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: tier.frame[0] }}
            >
              {label}
            </span>
          ) : null}
          <span className="line-clamp-2 text-lg font-semibold leading-tight tracking-[-0.01em] text-[rgb(var(--sheen-channels))]">
            {scene.title}
          </span>
          {scene.code ? (
            <span
              className="font-mono text-sm font-semibold tracking-[0.18em]"
              style={{ color: tier.glow }}
            >
              {prizeCodeGroups(scene.code)}
            </span>
          ) : null}
          {scene.points ? (
            <span className="text-sm font-semibold tabular-nums" style={{ color: tier.glow }}>
              +<CountUp delayMs={still ? 0 : timeline.text.at} value={scene.points} /> pts
            </span>
          ) : null}
        </div>
        {/* Reflejo holográfico: solo en reposo y solo si hay movimiento permitido. */}
        {still || tier.holo === 'none' ? null : (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={{
              background: tier.holo === 'rainbow' ? holoIridescent(scene, tier) : HOLO_SOFT,
              animation: `celebration-holo ${tier.holo === 'rainbow' ? 3.4 : 4.2}s cubic-bezier(0.4, 0, 0.2, 1) ${timeline.rest}ms infinite both`,
            }}
          />
        )}
      </div>
    </div>
  );
}

export function CelebrationCard({
  scene,
  tier,
  timeline,
  still,
}: Readonly<{
  scene: CardScene;
  tier: CardTier;
  timeline: CardTimeline;
  still: boolean;
}>) {
  // De dorso hasta el reventón; con movimiento reducido, de frente desde ya.
  const [front, setFront] = useState(still);
  const [revealed, setRevealed] = useState(still);

  useEffect(() => {
    if (still) {
      const raf = window.requestAnimationFrame(() => {
        setFront(true);
        setRevealed(true);
      });
      return () => window.cancelAnimationFrame(raf);
    }
    const timer = window.setTimeout(() => {
      setFront(true);
      setRevealed(true);
    }, timeline.flip.at);
    return () => window.clearTimeout(timer);
  }, [still, timeline.flip.at]);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(
    useTransform(pointerX, [-0.5, 0.5], [-TILT_MAX, TILT_MAX]),
    TILT_SPRING,
  );
  const rotateX = useSpring(
    useTransform(pointerY, [-0.5, 0.5], [TILT_MAX, -TILT_MAX]),
    TILT_SPRING,
  );

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (still || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  }
  function onPointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  const preserve: CSSProperties = { transformStyle: 'preserve-3d' };

  return (
    <motion.div
      animate={{ y: 0, opacity: 1, scale: 1 }}
      className="relative"
      initial={still ? false : { y: 140, opacity: 0, scale: 0.82 }}
      style={{ perspective: CARD_PERSPECTIVE }}
      transition={{ type: 'spring', stiffness: 240, damping: 20, mass: 0.9 }}
    >
      <button
        aria-label={front ? 'Voltear la carta' : 'Revelar la carta'}
        className="block touch-manipulation rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--sheen-channels))] focus-visible:ring-offset-4 focus-visible:ring-offset-[rgb(var(--scrim-channels))]"
        disabled={!revealed}
        onClick={() => setFront((value) => !value)}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        type="button"
      >
        <motion.div style={{ ...preserve, rotateX, rotateY }}>
          <motion.div
            animate={still ? { rotate: 0 } : { rotate: wobbleKeyframes(tier.wobbleDeg, 12) }}
            style={preserve}
            transition={
              still
                ? { duration: 0 }
                : {
                    delay: s(timeline.tension.at),
                    duration: s(timeline.tension.dur),
                    ease: 'easeInOut',
                  }
            }
          >
            <motion.div
              animate={{ rotateY: front ? 180 : 0, scale: revealed && !still ? [1, 1.12, 1] : 1 }}
              className="relative aspect-[5/7] w-[min(260px,62vw)]"
              initial={false}
              style={{ ...preserve, willChange: 'transform' }}
              transition={
                still
                  ? { duration: 0 }
                  : {
                      rotateY: { duration: s(timeline.flip.dur), ease: [0.3, 0.9, 0.3, 1] },
                      scale: {
                        duration: s(timeline.flip.dur),
                        times: [0, 0.5, 1],
                        ease: 'easeOut',
                      },
                    }
              }
            >
              <CardBack still={still} tier={tier} timeline={timeline} />
              <CardFront scene={scene} still={still} tier={tier} timeline={timeline} />
            </motion.div>
          </motion.div>
        </motion.div>
      </button>
    </motion.div>
  );
}
