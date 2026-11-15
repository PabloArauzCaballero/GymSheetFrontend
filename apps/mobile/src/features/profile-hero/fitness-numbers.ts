import type { Progression } from '@gymsheet/schemas';

/**
 * Points, streak and sessions from the real progression: what the hero shows
 * under the name and what «Compartir» brags about. The live streak wins over
 * the stats snapshot when the server sends it.
 */
export function fitnessNumbers(progress: Pick<Progression, 'points' | 'streak' | 'stats'>) {
  return {
    points: progress.points,
    streak: progress.streak?.current ?? progress.stats.currentStreakDays,
    sessions: progress.stats.totalSessions,
  };
}
