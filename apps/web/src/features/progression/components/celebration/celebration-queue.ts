import type {
  BadgeRarity,
  Challenge,
  Prize,
  Progression,
  ProgressionBadge,
  ProgressionLevel,
  SessionReward,
  WeeklyChallenges,
} from '@/shared/api/schemas';

/**
 * La cola de cartas: qué se celebra y en qué orden. Gemela de
 * `apps/mobile/src/components/celebration/queue.ts` —mismos sujetos, mismo
 * orden—, porque quien usa las dos plataformas abre el mismo cofre.
 *
 * Regla pico-final: la cola sube de intensidad y cierra con lo más grande:
 *
 *   insignias (de común a legendaria) → retos cumplidos (fácil → difícil)
 *   → semana redonda → comodín → premios → rango.
 *
 * `fresh` distingue lo recién ganado de la revisita: solo lo nuevo lleva sello
 * y titular de «¡conseguida!».
 */
export type CelebrationSubject =
  | Readonly<{ kind: 'badge'; badge: ProgressionBadge; fresh?: boolean }>
  | Readonly<{ kind: 'level'; level: ProgressionLevel; fresh?: boolean }>
  | Readonly<{ kind: 'challenge'; challenge: Challenge; fresh?: boolean }>
  | Readonly<{ kind: 'perfect'; weekStart: string; bonus: number; fresh?: boolean }>
  | Readonly<{ kind: 'freeze'; streakDays: number; freezes: number; fresh?: boolean }>
  | Readonly<{ kind: 'prize'; prize: Prize; fresh?: boolean }>;

export type CelebrationKind = CelebrationSubject['kind'];

export function keyOf(subject: CelebrationSubject): string {
  switch (subject.kind) {
    case 'badge':
      return `badge:${subject.badge.code}`;
    case 'level':
      return `level:${subject.level.code}`;
    case 'challenge':
      return `challenge:${subject.challenge.code}`;
    case 'perfect':
      return `perfect:${subject.weekStart}`;
    case 'freeze':
      return `freeze:${subject.streakDays}`;
    case 'prize':
      return `prize:${subject.prize.id}`;
  }
}

const RARITY_ORDER: Readonly<Record<BadgeRarity, number>> = {
  COMUN: 0,
  RARA: 1,
  EPICA: 2,
  LEGENDARIA: 3,
};
const DIFFICULTY_ORDER: Readonly<Record<Challenge['difficulty'], number>> = {
  FACIL: 0,
  MEDIO: 1,
  DIFICIL: 2,
};
const DIFFICULTY_RARITY: Readonly<Record<Challenge['difficulty'], BadgeRarity>> = {
  FACIL: 'COMUN',
  MEDIO: 'RARA',
  DIFICIL: 'EPICA',
};

/** El material de un reto: sube con la dificultad (jade, zafiro, amatista). */
export function challengeRarity(challenge: Pick<Challenge, 'difficulty'>): BadgeRarity {
  return DIFFICULTY_RARITY[challenge.difficulty];
}

/**
 * El material de la carta de cada sujeto. La semana redonda es épica; el
 * comodín, zafiro (hielo); premio y rango, oro.
 */
export function rarityOf(subject: CelebrationSubject): BadgeRarity {
  switch (subject.kind) {
    case 'badge':
      return subject.badge.rarity;
    case 'challenge':
      return challengeRarity(subject.challenge);
    case 'perfect':
      return 'EPICA';
    case 'freeze':
      return 'RARA';
    case 'prize':
    case 'level':
      return 'LEGENDARIA';
  }
}

const KIND_ORDER: Readonly<Record<CelebrationKind, number>> = {
  badge: 0,
  challenge: 1,
  perfect: 2,
  freeze: 3,
  prize: 4,
  level: 5,
};

function intensity(subject: CelebrationSubject): number {
  if (subject.kind === 'badge') return RARITY_ORDER[subject.badge.rarity];
  if (subject.kind === 'challenge') return DIFFICULTY_ORDER[subject.challenge.difficulty];
  return 0;
}

/** Ordena por pico-final (estable dentro de cada grupo) y quita duplicados. */
export function orderCelebrations(subjects: readonly CelebrationSubject[]): CelebrationSubject[] {
  const seen = new Set<string>();
  const unique = subjects.filter((subject) => {
    const key = keyOf(subject);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique
    .map((subject, index) => ({ subject, index }))
    .sort(
      (a, b) =>
        KIND_ORDER[a.subject.kind] - KIND_ORDER[b.subject.kind] ||
        intensity(a.subject) - intensity(b.subject) ||
        a.index - b.index,
    )
    .map(({ subject }) => subject);
}

/** Lo que una sesión recién cerrada trae para abrir, ya ordenado. */
export function rewardCelebrations(reward: SessionReward): CelebrationSubject[] {
  const subjects: CelebrationSubject[] = reward.unlockedNow.map((badge) => ({
    kind: 'badge',
    badge,
    fresh: true,
  }));
  for (const challenge of reward.challengesCompletedNow)
    subjects.push({ kind: 'challenge', challenge, fresh: true });
  if (reward.perfectWeekNow && reward.challenges) {
    const { weekStart, perfectBonus } = reward.challenges;
    subjects.push({ kind: 'perfect', weekStart, bonus: perfectBonus, fresh: true });
  }
  if (reward.streak?.freezeEarnedNow) {
    const { current, freezes } = reward.streak;
    subjects.push({ kind: 'freeze', streakDays: current, freezes, fresh: true });
  }
  for (const prize of reward.prizesNow) subjects.push({ kind: 'prize', prize, fresh: true });
  if (reward.leveledUp && reward.levelAfter)
    subjects.push({ kind: 'level', level: reward.levelAfter, fresh: true });
  return orderCelebrations(subjects);
}

/**
 * Lo pendiente de celebrar al abrir la senda: insignias que siguen `isNew`,
 * retos y semana redonda sin ver, y premios nuevos. El rango lo detecta el
 * cliente aparte (`useLevelUpWatch`) y entra al final.
 */
export function progressionCelebrations(
  data: Pick<Progression, 'unlockedNow' | 'badges' | 'prizes'> & { challenges?: WeeklyChallenges },
  level: ProgressionLevel | null = null,
): CelebrationSubject[] {
  const subjects: CelebrationSubject[] = data.unlockedNow.map((badge) => ({
    kind: 'badge',
    badge,
    fresh: true,
  }));
  for (const badge of data.badges) {
    if (badge.earned && badge.isNew) subjects.push({ kind: 'badge', badge, fresh: true });
  }
  const week = data.challenges;
  if (week) {
    for (const challenge of week.items) {
      if (challenge.completed && challenge.isNew)
        subjects.push({ kind: 'challenge', challenge, fresh: true });
    }
    if (week.perfect && week.perfectIsNew) {
      subjects.push({
        kind: 'perfect',
        weekStart: week.weekStart,
        bonus: week.perfectBonus,
        fresh: true,
      });
    }
  }
  for (const prize of data.prizes)
    if (prize.isNew) subjects.push({ kind: 'prize', prize, fresh: true });
  if (level) subjects.push({ kind: 'level', level, fresh: true });
  return orderCelebrations(subjects);
}
