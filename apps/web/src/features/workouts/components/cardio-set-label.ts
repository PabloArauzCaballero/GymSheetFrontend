import type { WorkoutSet } from '@/shared/api/contracts';
import { formatNumber } from '@/shared/lib/numbers';

/** «32 min · 8,4 km · 142 lpm · esfuerzo 4»: lo que se anotó en una serie de cardio, sin inventar nada. */
export function cardioSetLabel(set: WorkoutSet): string {
  const parts: string[] = [];
  if (set.duracionSeg != null) parts.push(`${formatNumber(Math.round((set.duracionSeg / 60) * 10) / 10)} min`);
  if (set.distanciaM != null && set.distanciaM > 0) {
    parts.push(`${formatNumber(Math.round((set.distanciaM / 1000) * 100) / 100)} km`);
  }
  if (set.fcMedia != null) parts.push(`${set.fcMedia} lpm`);
  if (set.rpe != null) parts.push(`esfuerzo ${set.rpe}`);
  return parts.length ? parts.join(' · ') : 'Serie de cardio';
}
