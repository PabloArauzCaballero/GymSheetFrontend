import { CARD_MATERIAL_INKS, CARD_TIERS, type CardRarity } from '@gymsheet/domain';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { withAlpha } from './progression-colors';
import { ProgressionIcon } from './progression-icon';

/**
 * El material de una rareza en pequeño: marco del metal y cara siempre
 * oscura, como la carta de la celebración. Sustituye al color propio de cada
 * insignia (`badge.color`): una rara es zafiro aquí, en el móvil y en su carta.
 *
 * La cara oscura no es un capricho: las tintas del material se midieron sobre
 * ella (≥ 7:1), así que el icono se lee igual en el tema claro y en el oscuro.
 *
 * `card` dibuja la carta 5:7 de las insignias; `glyph`, la ficha cuadrada de
 * retos, premios y comodines.
 */
export type MaterialState = 'earned' | 'pending' | 'veiled';

export function MaterialCard({
  rarity,
  icon,
  state = 'earned',
  shape = 'card',
  size = 40,
  className,
}: Readonly<{
  rarity: CardRarity;
  icon: string;
  state?: MaterialState;
  shape?: 'card' | 'glyph';
  size?: number;
  className?: string;
}>) {
  const tier = CARD_TIERS[rarity];
  const ink = CARD_MATERIAL_INKS[rarity];
  const [light, mid, deep] = tier.frame;
  const lit = state === 'earned';
  const height = shape === 'card' ? Math.round((size * 7) / 5) : size;
  const radius = shape === 'card' ? Math.max(6, size / 6) : Math.max(8, size / 4);

  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 p-[2px]',
        lit ? '' : 'opacity-60 saturate-[0.35]',
        className,
      )}
      style={{
        width: size,
        height,
        borderRadius: radius,
        background: `linear-gradient(150deg, ${light} 0%, ${mid} 40%, ${deep} 100%)`,
        boxShadow: lit ? `0 6px 16px ${withAlpha(ink.shadow, 0.28)}` : undefined,
      }}
    >
      <span
        className="grid place-items-center"
        style={{
          borderRadius: radius - 2,
          backgroundColor: 'rgb(var(--scrim-channels))',
          backgroundImage: `radial-gradient(circle at 50% 38%, ${withAlpha(ink.art[0], lit ? 0.9 : 0.5)}, ${withAlpha(ink.art[2], 0.9)} 78%)`,
        }}
      >
        {state === 'veiled' ? (
          <HelpCircle className="size-[46%]" style={{ color: ink.label }} />
        ) : (
          <ProgressionIcon
            className="size-[50%]"
            name={icon}
            style={{
              color: ink.label,
              filter: lit ? `drop-shadow(0 0 6px ${withAlpha(ink.glow, 0.7)})` : undefined,
            }}
          />
        )}
      </span>
    </span>
  );
}

/** El color de barra y acentos de una rareza sobre la superficie del tema. */
export function materialAccent(rarity: CardRarity): string {
  return CARD_TIERS[rarity].frame[1];
}

/**
 * Una insignia que todavía no se enseña: secreta y sin conseguir. Mismo
 * criterio que el móvil (`isVeiled` en `cards/resolve.ts`).
 */
export function isVeiled(badge: {
  earned: boolean;
  secret?: boolean | null;
  category?: string | null;
  progress?: number | null;
}): boolean {
  if (badge.earned) return false;
  if (badge.secret != null) return badge.secret;
  return badge.category === 'SECRETA' && badge.progress == null;
}
