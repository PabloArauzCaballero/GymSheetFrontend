import type { Ionicons } from '@expo/vector-icons';
import {
  CARD_RARITY_LABEL,
  CHALLENGE_DIFFICULTY_LABEL,
  prizeCodeGroups,
  seedFrom,
  tierFor,
  type CardTier,
} from '@gymsheet/domain';
import type { IllustrationKey } from '@/components/cards/art';
import { resolveIllustration } from '@/components/cards/resolve';
import { accentPolicy, cardMaterials, colors, type CardMaterial, type CardRarityKey } from '@/theme';
import { rarityOf, type CelebrationSubject } from './queue';

export { keyOf, type CelebrationSubject } from './queue';

/** Todo lo que la carta pinta, resuelto una vez desde el sujeto. */
export interface CardScene {
  tier: CardTier;
  /** Material de la carta (marco, arte, foil) y su dibujo. */
  rarity: CardRarityKey;
  material: CardMaterial;
  art: IllustrationKey;
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
  /** Código del premio, para enseñarlo en recepción. Solo en la carta de premio. */
  code: string | null;
  seed: number;
  announcement: string;
}

/** La carta de un material fijo: rótulo, luz y tinta salen de la rareza, no del servidor. */
function fixed(rarity: CardRarityKey) {
  const material = cardMaterials[rarity];
  return { tier: tierFor(rarity), rarity, material, tint: material.glow, ink: material.label } as const;
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
      rarity: badge.rarity,
      material: cardMaterials[badge.rarity],
      art: resolveIllustration(badge),
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
      code: null,
      seed: seedFrom(badge.code),
      announcement: `¡Insignia conseguida! ${badge.name}. Rareza: ${rarityLabel}.${
        points > 0 ? ` +${points} puntos.` : ''
      } ${flavor}`,
    };
  }

  if (subject.kind === 'challenge') {
    const { challenge } = subject;
    const fresh = subject.fresh ?? challenge.isNew;
    const label = `Reto ${CHALLENGE_DIFFICULTY_LABEL[challenge.difficulty].toLocaleLowerCase('es')}`;
    return {
      ...fixed(rarityOf(subject)),
      art: 'target',
      rarityLabel: label,
      stamp: fresh ? '¡CUMPLIDO!' : null,
      heading: fresh ? '¡Reto cumplido!' : 'Reto de la semana',
      title: challenge.title,
      flavor: challenge.description,
      icon: challenge.icon as keyof typeof Ionicons.glyphMap,
      points: challenge.pointsReward,
      code: null,
      seed: seedFrom(`challenge:${challenge.code}`),
      announcement: `¡Reto cumplido! ${challenge.title}. +${challenge.pointsReward} puntos.`,
    };
  }

  if (subject.kind === 'perfect') {
    return {
      ...fixed(rarityOf(subject)),
      art: 'calendar-week',
      rarityLabel: 'Tres de tres',
      stamp: subject.fresh === false ? null : '¡REDONDA!',
      heading: '¡Semana redonda!',
      title: 'Semana redonda',
      flavor: 'Los tres retos de la semana, cumplidos. El lunes llegan otros tres.',
      icon: 'checkmark-done-circle',
      points: subject.bonus,
      code: null,
      seed: seedFrom(`perfect:${subject.weekStart}`),
      announcement: `¡Semana redonda! Los tres retos cumplidos. +${subject.bonus} puntos.`,
    };
  }

  if (subject.kind === 'freeze') {
    const days = `${subject.streakDays} ${subject.streakDays === 1 ? 'día' : 'días'}`;
    return {
      ...fixed(rarityOf(subject)),
      art: 'snowflake',
      rarityLabel: subject.freezes > 1 ? `Guardas ${subject.freezes}` : 'Racha',
      stamp: subject.fresh === false ? null : '+1',
      heading: '¡Comodín ganado!',
      title: 'Comodín',
      flavor: `${days} seguidos. Si un día no puedes venir, el comodín se gasta solo y tu racha sigue.`,
      icon: 'snow',
      points: 0,
      code: null,
      seed: seedFrom(`freeze:${subject.streakDays}`),
      announcement: `¡Comodín ganado! Llevas ${days}. Si un día no puedes venir, tu racha sigue.`,
    };
  }

  if (subject.kind === 'prize') {
    const { prize } = subject;
    const fresh = subject.fresh ?? prize.isNew;
    return {
      ...fixed(rarityOf(subject)),
      art: 'gift',
      rarityLabel: 'Premio',
      stamp: fresh ? '¡ES TUYO!' : null,
      heading: fresh ? '¡Premio desbloqueado!' : 'Tu premio',
      title: prize.title,
      flavor: prize.instructions ?? `Por ${prize.source.name}. Enséñalo en recepción.`,
      icon: prize.icon as keyof typeof Ionicons.glyphMap,
      points: 0,
      code: prize.code,
      seed: seedFrom(`prize:${prize.id}`),
      announcement: `¡Premio desbloqueado! ${prize.title}. Tu código: ${prizeCodeGroups(prize.code).split('').join(' ')}.`,
    };
  }

  const { level } = subject;
  const fresh = subject.fresh ?? false;
  return {
    // Un rango nuevo es lo más grande que pasa en la app: fila legendaria.
    tier: tierFor(null),
    rarity: 'LEGENDARIA',
    material: cardMaterials.LEGENDARIA,
    art: 'crown',
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
    code: null,
    seed: seedFrom(level.code),
    announcement: fresh
      ? `¡Has subido de rango! Ahora eres ${level.name}. ${level.tagline}`
      : `Tu rango: ${level.name}. ${level.tagline}`,
  };
}
