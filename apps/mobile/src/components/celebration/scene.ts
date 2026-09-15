import type { Ionicons } from '@expo/vector-icons';
import { CARD_RARITY_LABEL, seedFrom, tierFor, type CardTier } from '@gymsheet/domain';
import type { ProgressionBadge, ProgressionLevel } from '@gymsheet/schemas';
import { accentPolicy, colors } from '@/theme';

/**
 * Lo que se celebra. Dos casos, y sólo dos.
 *
 * `fresh` distingue el premio recién ganado de la revisita: sólo lo nuevo lleva
 * sello y titular de «¡conseguida!». Volver a abrir una insignia de hace meses
 * con «¡NUEVA!» encima sería mentir.
 */
export type CelebrationSubject =
  | { kind: 'badge'; badge: ProgressionBadge; fresh?: boolean }
  | { kind: 'level'; level: ProgressionLevel; fresh?: boolean };

/** Todo lo que la carta pinta, resuelto una vez desde el sujeto. */
export interface CardScene {
  tier: CardTier;
  rarityLabel: string | null;
  /** Color de la luz: fondo del arte, halo y rayos del frente. */
  tint: string;
  /** Color del icono y de la cifra de puntos. */
  ink: string;
  /** Sello que cae sobre la carta, o nada en una revisita. */
  stamp: string | null;
  heading: string;
  title: string;
  flavor: string;
  icon: keyof typeof Ionicons.glyphMap;
  points: number;
  seed: number;
  announcement: string;
}

export function keyOf(subject: CelebrationSubject): string {
  return subject.kind === 'badge' ? `badge:${subject.badge.code}` : `level:${subject.level.code}`;
}

export function sceneOf(subject: CelebrationSubject): CardScene {
  if (subject.kind === 'badge') {
    const { badge } = subject;
    const fresh = subject.fresh ?? badge.isNew;
    const rarityLabel = CARD_RARITY_LABEL[badge.rarity];
    const flavor = badge.flavorText ?? badge.description;
    const points = badge.pointsReward;
    return {
      tier: tierFor(badge.rarity),
      rarityLabel,
      // El color del catálogo es lo que distingue una insignia de las otras
      // treinta; apagarlo aquí sería celebrarlas todas igual.
      tint: badge.color,
      ink: badge.color,
      stamp: fresh ? '¡NUEVA!' : null,
      heading: fresh ? '¡Insignia conseguida!' : 'Tu insignia',
      title: badge.name,
      flavor,
      icon: badge.icon as keyof typeof Ionicons.glyphMap,
      points,
      seed: seedFrom(badge.code),
      announcement: `¡Insignia conseguida! ${badge.name}. Rareza: ${rarityLabel}.${
        points > 0 ? ` +${points} puntos.` : ''
      } ${flavor}`,
    };
  }

  const { level } = subject;
  const fresh = subject.fresh ?? false;
  return {
    // Un rango nuevo es lo más grande que pasa en la app: fila legendaria.
    tier: tierFor(null),
    rarityLabel: null,
    // Acento del gimnasio y no `level.color`: la rampa de niveles se escribió
    // sin inquilinos y metía un azul a pantalla completa en marcas rojas.
    tint: colors.volt,
    ink: accentPolicy.ink,
    stamp: fresh ? '¡NUEVO RANGO!' : null,
    heading: fresh ? '¡Has subido de rango!' : 'Tu rango',
    title: level.name,
    flavor: level.tagline,
    icon: level.icon as keyof typeof Ionicons.glyphMap,
    points: 0,
    seed: seedFrom(level.code),
    announcement: fresh
      ? `¡Has subido de rango! Ahora eres ${level.name}. ${level.tagline}`
      : `Tu rango: ${level.name}. ${level.tagline}`,
  };
}
