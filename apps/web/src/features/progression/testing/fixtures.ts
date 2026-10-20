import type {
  Challenge,
  Prize,
  ProgressionBadge,
  ProgressionLevel,
  SessionReward,
  WeeklyChallenges,
} from '@/shared/api/schemas';

/**
 * Datos de prueba de la senda. Solo los importan los tests; el color es un
 * nombre CSS y no un hex para no tropezar con la regla de colores literales.
 */
export const badge = (
  code: string,
  rarity: ProgressionBadge['rarity'] = 'COMUN',
  extra: Partial<ProgressionBadge> = {},
): ProgressionBadge => ({
  code,
  name: code,
  description: `Descripción de ${code}`,
  flavorText: null,
  category: 'HITO',
  rarity,
  icon: 'medal-outline',
  color: 'teal',
  pointsReward: 10,
  earned: true,
  earnedAt: null,
  isNew: false,
  progress: null,
  progressLabel: null,
  ...extra,
});

export const challenge = (
  code: string,
  difficulty: Challenge['difficulty'] = 'FACIL',
  extra: Partial<Challenge> = {},
): Challenge => ({
  code,
  kind: 'SESSIONS',
  difficulty,
  title: `Reto ${code}`,
  description: 'Una línea',
  icon: 'calendar-outline',
  target: 3,
  current: 3,
  progress: 1,
  progressLabel: '3 / 3',
  pointsReward: 60,
  completed: true,
  completedAt: null,
  isNew: true,
  ...extra,
});

export const prize = (id: string, extra: Partial<Prize> = {}): Prize => ({
  id,
  title: `Premio ${id}`,
  description: null,
  instructions: 'Enséñalo en recepción',
  icon: 'gift-outline',
  source: { kind: 'BADGE', code: 'RACHA_30', name: 'Racha de 30' },
  code: 'K7M2QX',
  status: 'DISPONIBLE',
  awardedAt: '2026-10-18T10:00:00Z',
  expiresAt: null,
  redeemedAt: null,
  isNew: true,
  ...extra,
});

export const week = (
  items: Challenge[],
  extra: Partial<WeeklyChallenges> = {},
): WeeklyChallenges => ({
  weekStart: '2026-10-12',
  endsAt: '2026-10-19T04:00:00Z',
  items,
  completedCount: items.filter((item) => item.completed).length,
  perfect: items.length > 0 && items.every((item) => item.completed),
  perfectBonus: 150,
  perfectIsNew: false,
  ...extra,
});

export const level = (code = 'MAQUINA', name = 'Máquina'): ProgressionLevel => ({
  code,
  name,
  tagline: 'Ya no hay vuelta atrás.',
  description: null,
  color: 'gold',
  icon: 'trophy-outline',
  minPoints: 1000,
  sortOrder: 4,
  unlocked: true,
  current: true,
});

export const sessionReward = (extra: Partial<SessionReward> = {}): SessionReward => ({
  pointsEarned: 120,
  pointsBefore: 1000,
  pointsAfter: 1120,
  breakdown: {
    session: 50,
    sets: 40,
    volume: 10,
    streak: 0,
    badges: 10,
    modes: 0,
    challenges: 0,
    progress: 0,
    penalties: 0,
    strikePurchases: 0,
  },
  leveledUp: false,
  levelBefore: null,
  levelAfter: null,
  nextLevel: null,
  pointsToNextLevel: null,
  levelProgressBefore: 0.2,
  levelProgress: 0.3,
  unlockedNow: [],
  challengesCompletedNow: [],
  perfectWeekNow: false,
  prizesNow: [],
  nearest: [],
  ...extra,
});
