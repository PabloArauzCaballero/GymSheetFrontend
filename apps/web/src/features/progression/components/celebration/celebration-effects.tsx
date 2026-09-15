'use client';

import { particleField, type CardTier, type CardTimeline } from '@gymsheet/domain';
import { motion } from 'framer-motion';
import { useMemo, type CSSProperties } from 'react';
import { withAlpha } from '../progression-colors';

/**
 * Lo que rodea a la carta: rayos, destello y chispas.
 *
 * Nada de esto se monta con «reducir movimiento»; quien llama ya lo decide.
 * Todo es gradiente o `span`: vectorial y barato de componer, sin lienzo.
 */

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const s = (ms: number) => ms / 1000;

/**
 * Rayos detrás de la carta: un `repeating-conic-gradient` de dieciséis lamas
 * disuelto con una máscara radial, para que parezca luz y no una rueda pintada.
 * Tenues durante la tensión, plenos al reventar.
 */
export function CelebrationRays({
  tier,
  timeline,
}: Readonly<{ tier: CardTier; timeline: CardTimeline }>) {
  if (tier.rays <= 0) return null;
  const slat = withAlpha(tier.glow, tier.rays);
  const mask =
    'radial-gradient(circle, rgb(var(--scrim-channels) / 1) 0%, rgb(var(--scrim-channels) / 1) 22%, transparent 68%)';
  return (
    <motion.div
      animate={{ opacity: [0, 0.35, 1], scale: [0.6, 0.85, 1] }}
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 size-[min(900px,180vw)] -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, scale: 0.6 }}
      transition={{
        delay: s(timeline.tension.at),
        duration: s(timeline.tension.dur + timeline.burst.dur),
        times: [0, 0.75, 1],
        ease: EASE_OUT,
      }}
    >
      <span
        className={`absolute inset-0 rounded-full ${
          tier.raysSpin ? 'animate-[celebration-rays-spin_24s_linear_infinite]' : ''
        }`}
        style={{
          background: `repeating-conic-gradient(from 0deg, ${slat} 0deg 7deg, transparent 7deg 22.5deg)`,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
      <span
        className="absolute inset-[30%] rounded-full blur-2xl"
        style={{ background: withAlpha(tier.glow, Math.min(0.55, tier.rays + 0.1)) }}
      />
    </motion.div>
  );
}

/** Destello blanco radial en el instante del reventón. */
export function CelebrationFlash({ timeline }: Readonly<{ timeline: CardTimeline }>) {
  return (
    <motion.div
      animate={{ opacity: [0, 0.95, 0], scale: [0.4, 1.3, 1.8] }}
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 size-[min(640px,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full"
      initial={{ opacity: 0 }}
      style={{
        background:
          'radial-gradient(circle, rgb(var(--sheen-channels) / 1) 0%, rgb(var(--sheen-channels) / 0.6) 22%, rgb(var(--sheen-channels) / 0) 60%)',
        willChange: 'transform, opacity',
      }}
      transition={{ delay: s(timeline.burst.at), duration: s(timeline.burst.dur * 2.2), ease: 'easeOut' }}
    />
  );
}

/**
 * Chispas del estallido. Cada una es un `span` con su destino en variables CSS
 * y un único keyframe compartido: cuarenta chispas cuestan cuarenta reglas
 * compuestas en GPU, no cuarenta animaciones orquestadas en JS.
 */
export function CelebrationParticles({
  tier,
  timeline,
  seed,
  spread,
}: Readonly<{ tier: CardTier; timeline: CardTimeline; seed: number; spread: number }>) {
  const field = useMemo(() => particleField(tier.particles, seed), [tier.particles, seed]);
  if (field.length === 0) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-0">
      {field.map((particle, index) => {
        const elongated = index % 3 === 0;
        const style = {
          '--dx': `${Math.cos(particle.angle) * particle.distance * spread}px`,
          '--dy': `${Math.sin(particle.angle) * particle.distance * spread}px`,
          '--spin': `${particle.spin}deg`,
          width: elongated ? particle.size * 0.45 : particle.size,
          height: elongated ? particle.size * 2.2 : particle.size,
          background: index % 4 === 0 ? 'rgb(var(--sheen-channels))' : tier.glow,
          boxShadow: `0 0 ${particle.size * 1.5}px ${withAlpha(tier.glow, 0.8)}`,
          animation: `celebration-particle ${particle.duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${
            timeline.burst.at + particle.delay
          }ms both`,
        } as CSSProperties;
        return <span className="absolute left-0 top-0 rounded-full" key={index} style={style} />;
      })}
    </div>
  );
}
