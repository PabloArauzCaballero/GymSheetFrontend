'use client';

import type { CardTier, CardTimeline } from '@gymsheet/domain';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { withAlpha } from '../progression-colors';

const s = (ms: number) => ms / 1000;

/** El marco de la carta: del canto iluminado al canto en sombra. */
export function frameGradient(tier: CardTier): string {
  const [light, mid, deep] = tier.frame;
  return `linear-gradient(150deg, ${light} 0%, ${mid} 38%, ${deep} 72%, ${mid} 100%)`;
}

/** El dorso: lo que se ve mientras la carta tiembla, antes del volteo. */
export function CardBack({
  tier,
  still,
  timeline,
}: Readonly<{ tier: CardTier; still: boolean; timeline: CardTimeline }>) {
  return (
    <div
      className="absolute inset-0 rounded-[22px] p-[6px] [backface-visibility:hidden]"
      style={{
        background: frameGradient(tier),
        boxShadow: `0 24px 60px ${withAlpha(tier.glow, 0.35)}`,
      }}
    >
      <div
        className="relative grid size-full place-items-center overflow-hidden rounded-[17px]"
        style={{
          backgroundColor: 'rgb(var(--scrim-channels))',
          backgroundImage: `repeating-linear-gradient(45deg, ${withAlpha(tier.glow, 0.09)} 0 2px, transparent 2px 14px), radial-gradient(circle at 50% 42%, ${withAlpha(tier.glow, 0.28)}, transparent 62%)`,
        }}
      >
        <span
          className="grid size-24 place-items-center rounded-full border-2"
          style={{
            borderColor: withAlpha(tier.frame[0], 0.8),
            boxShadow: `0 0 32px ${withAlpha(tier.glow, 0.55)}, inset 0 0 18px ${withAlpha(tier.glow, 0.35)}`,
          }}
        >
          <Sparkles aria-hidden className="size-10" style={{ color: tier.frame[0] }} />
        </span>
        <span
          className="absolute bottom-6 text-[11px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: withAlpha(tier.frame[0], 0.85) }}
        >
          Recompensa
        </span>
        {/* La carta se carga de luz mientras tiembla: la tensión se ve, no solo se mueve. */}
        {still ? null : (
          <motion.span
            animate={{ opacity: [0, 0.2, 0.95] }}
            aria-hidden
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            style={{
              background: `radial-gradient(circle at 50% 45%, ${withAlpha(tier.glow, 0.9)}, transparent 70%)`,
            }}
            transition={{
              delay: s(timeline.tension.at),
              duration: s(timeline.tension.dur),
              times: [0, 0.4, 1],
              ease: 'easeIn',
            }}
          />
        )}
      </div>
    </div>
  );
}
