/**
 * Tus puntos, partida por partida, con la cuenta a la vista.
 *
 * Lo usan la hoja móvil y el diálogo web de «Cómo se ganan los puntos». Vive
 * aquí para que las dos pantallas hagan exactamente la misma cuenta que el
 * servidor (`computePointsBreakdown`): si divergieran, la explicación diría un
 * total distinto del marcador, que es lo peor que puede hacer una explicación.
 */

import type { PointRuleLine } from './celebration';

export type PointRulesInput = Readonly<{
  perSession: number;
  perSet: number;
  perVolumeUnitKg: number;
  perLongestStreakDay: number;
}>;

export type PointStatsInput = Readonly<{
  totalSessions: number;
  totalSets: number;
  totalVolumeKg: number;
  longestStreakDays: number;
}>;

export type PointFigure = Readonly<{ detail: string; total: number }>;

function format(value: number): string {
  return value.toLocaleString('es-ES');
}

function plural(count: number, one: string, many: string): string {
  return `${format(count)} ${count === 1 ? one : many}`;
}

export function pointsFigures(
  rules: PointRulesInput,
  stats: PointStatsInput,
  badges: readonly Readonly<{ earned: boolean; pointsReward: number }>[],
): Record<PointRuleLine['key'], PointFigure> {
  const earned = badges.filter((badge) => badge.earned);
  return {
    session: {
      detail: `${plural(stats.totalSessions, 'entreno', 'entrenos')} × ${rules.perSession}`,
      total: stats.totalSessions * rules.perSession,
    },
    sets: {
      detail: `${plural(stats.totalSets, 'serie', 'series')} × ${rules.perSet}`,
      total: stats.totalSets * rules.perSet,
    },
    volume: {
      detail: `${format(Math.round(stats.totalVolumeKg))} kg ÷ ${format(rules.perVolumeUnitKg)}`,
      total: Math.floor(stats.totalVolumeKg / rules.perVolumeUnitKg),
    },
    streak: {
      detail: `${plural(stats.longestStreakDays, 'día', 'días')} × ${rules.perLongestStreakDay}`,
      total: stats.longestStreakDays * rules.perLongestStreakDay,
    },
    badges: {
      detail: plural(earned.length, 'insignia', 'insignias'),
      total: earned.reduce((sum, badge) => sum + badge.pointsReward, 0),
    },
  };
}

/** Tarifas cortas para los chips junto a cada cifra. */
export function pointRateChips(rules: PointRulesInput) {
  return {
    session: `+${rules.perSession} c/u`,
    sets: `+${rules.perSet} c/u`,
    volume: `+1 cada ${format(rules.perVolumeUnitKg)} kg`,
    streak: `+${rules.perLongestStreakDay} por día`,
  } as const;
}

export const SECRET_BADGES_HINT = 'Las secretas se revelan al conseguirlas.';
