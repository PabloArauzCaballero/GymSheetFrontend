import {
  CARD_MATERIAL_INKS,
  CARD_RARITY_LABEL,
  CHALLENGE_DIFFICULTY_LABEL,
  prizeCodeGroups,
  seedFrom,
  tierFor,
  type CardRarity,
  type CardTier,
} from '@gymsheet/domain';
import { keyOf, rarityOf, type CelebrationSubject } from './celebration-queue';

/**
 * Todo lo que la escena pinta, resuelto una vez desde el sujeto. Gemelo de
 * `sceneOf` del móvil: mismos rótulos, sellos y textos.
 */
export type CardScene = Readonly<{
  key: string;
  kind: CelebrationSubject['kind'];
  rarity: CardRarity;
  tier: CardTier;
  /** Luz del arte (hex): el color del catálogo en insignias y rangos, el del material en lo demás. */
  tint: string;
  /** Rótulo del frente de la carta («Rara», «Reto medio», «Premio»). */
  label: string | null;
  /** Línea sobre el título de la escena. */
  eyebrow: string;
  heading: string;
  title: string;
  flavor: string | null;
  /** Nombre de Ionicons; `ProgressionIcon` lo traduce. */
  icon: string;
  points: number | null;
  /** Código del premio, para enseñarlo en recepción. */
  code: string | null;
  /** Sello que cae sobre la carta, o nada en una revisita. */
  stamp: string | null;
  seed: number;
  announcement: string;
}>;

function fixed(subject: CelebrationSubject) {
  const rarity = rarityOf(subject);
  return {
    key: keyOf(subject),
    kind: subject.kind,
    rarity,
    tier: tierFor(rarity),
    tint: CARD_MATERIAL_INKS[rarity].glow,
  };
}

function plusPoints(points: number): string {
  return points > 0 ? ` +${points} puntos.` : '';
}

export function sceneOf(subject: CelebrationSubject): CardScene {
  switch (subject.kind) {
    case 'badge': {
      const { badge } = subject;
      const fresh = subject.fresh ?? badge.isNew;
      const label = CARD_RARITY_LABEL[badge.rarity];
      return {
        ...fixed(subject),
        // El color del catálogo distingue una insignia de las otras treinta.
        tint: badge.color,
        label,
        eyebrow: `Insignia ${label.toLocaleLowerCase('es')}`,
        stamp: fresh ? '¡Nueva!' : null,
        heading: fresh ? '¡Insignia conseguida!' : 'Tu insignia',
        title: badge.name,
        flavor: badge.flavorText ?? badge.description,
        icon: badge.icon,
        points: badge.pointsReward > 0 ? badge.pointsReward : null,
        code: null,
        seed: seedFrom(badge.code),
        announcement: `¡Insignia conseguida! ${badge.name}. Rareza: ${label}.${plusPoints(badge.pointsReward)}`,
      };
    }
    case 'challenge': {
      const { challenge } = subject;
      const fresh = subject.fresh ?? challenge.isNew;
      const label = `Reto ${CHALLENGE_DIFFICULTY_LABEL[challenge.difficulty].toLocaleLowerCase('es')}`;
      return {
        ...fixed(subject),
        label,
        eyebrow: label,
        stamp: fresh ? '¡Cumplido!' : null,
        heading: fresh ? '¡Reto cumplido!' : 'Reto de la semana',
        title: challenge.title,
        flavor: challenge.description,
        icon: challenge.icon,
        points: challenge.pointsReward,
        code: null,
        seed: seedFrom(`challenge:${challenge.code}`),
        announcement: `¡Reto cumplido! ${challenge.title}.${plusPoints(challenge.pointsReward)}`,
      };
    }
    case 'perfect':
      return {
        ...fixed(subject),
        label: 'Tres de tres',
        eyebrow: 'Tres de tres',
        stamp: subject.fresh === false ? null : '¡Redonda!',
        heading: '¡Semana redonda!',
        title: 'Semana redonda',
        flavor: 'Los tres retos de la semana, cumplidos. El lunes llegan otros tres.',
        icon: 'checkmark-done-circle',
        points: subject.bonus,
        code: null,
        seed: seedFrom(`perfect:${subject.weekStart}`),
        announcement: `¡Semana redonda! Los tres retos cumplidos.${plusPoints(subject.bonus)}`,
      };
    case 'freeze': {
      const days = `${subject.streakDays} ${subject.streakDays === 1 ? 'día' : 'días'}`;
      return {
        ...fixed(subject),
        label: subject.freezes > 1 ? `Guardas ${subject.freezes}` : 'Racha',
        eyebrow: 'Racha',
        stamp: subject.fresh === false ? null : '+1',
        heading: '¡Comodín ganado!',
        title: 'Comodín',
        flavor: `${days} seguidos. Si un día no puedes venir, el comodín se gasta solo y tu racha sigue.`,
        icon: 'snow',
        points: null,
        code: null,
        seed: seedFrom(`freeze:${subject.streakDays}`),
        announcement: `¡Comodín ganado! Llevas ${days}. Si un día no puedes venir, tu racha sigue.`,
      };
    }
    case 'prize': {
      const { prize } = subject;
      const fresh = subject.fresh ?? prize.isNew;
      const spelled = prizeCodeGroups(prize.code).split('').join(' ');
      return {
        ...fixed(subject),
        label: 'Premio',
        eyebrow: `Premio · por ${prize.source.name}`,
        stamp: fresh ? '¡Es tuyo!' : null,
        heading: fresh ? '¡Premio desbloqueado!' : 'Tu premio',
        title: prize.title,
        flavor: prize.instructions ?? 'Enséñalo en recepción.',
        icon: prize.icon,
        points: null,
        code: prize.code,
        seed: seedFrom(`prize:${prize.id}`),
        announcement: `${fresh ? '¡Premio desbloqueado!' : 'Tu premio:'} ${prize.title}. Tu código: ${spelled}.`,
      };
    }
    case 'level': {
      const { level } = subject;
      const fresh = subject.fresh ?? false;
      return {
        ...fixed(subject),
        tint: level.color,
        label: 'Rango',
        eyebrow: 'Nuevo rango',
        stamp: fresh ? '¡Nuevo rango!' : null,
        heading: fresh ? '¡Has subido de rango!' : 'Tu rango',
        title: level.name,
        flavor: level.tagline,
        icon: level.icon,
        points: null,
        code: null,
        seed: seedFrom(level.code),
        announcement: fresh
          ? `¡Has subido de rango! Ahora eres ${level.name}. ${level.tagline}`
          : `Tu rango: ${level.name}. ${level.tagline}`,
      };
    }
  }
}
