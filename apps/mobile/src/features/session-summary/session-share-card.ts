import type { SessionComparison, SessionRecord } from '@gymsheet/domain';
import type { ShareCardData } from '@/features/share-card/share-card';

/**
 * Los datos de la tarjeta 9:16 del resumen: los mismos números que enseña la
 * portada (volumen, comparación, récords, tres hechos). Solo cifras reales.
 */
export function shareCardFromSession({
  title,
  volumeKg,
  sets,
  exercises,
  duration,
  comparison,
  records,
  author,
}: {
  title: string | null;
  volumeKg: number;
  sets: number;
  exercises: number | null;
  duration: string | null;
  comparison: SessionComparison | null;
  records: readonly SessionRecord[];
  author: string | null;
}): ShareCardData {
  const volume = Math.round(volumeKg);
  const highlight =
    records.length > 0
      ? records.length === 1
        ? '1 récord nuevo'
        : `${records.length} récords nuevos`
      : comparison?.direction === 'up'
        ? `+${Math.abs(comparison.changePct)} % frente a mi última sesión`
        : null;
  const stats = [
    duration ? { value: duration, label: 'duración' } : null,
    { value: String(sets), label: sets === 1 ? 'serie' : 'series' },
    exercises !== null ? { value: String(exercises), label: exercises === 1 ? 'ejercicio' : 'ejercicios' } : null,
  ].filter((stat): stat is { value: string; label: string } => stat !== null);
  return {
    kicker: title ? `Sesión terminada · ${title}` : 'Sesión terminada',
    hero: volume > 0 ? volume.toLocaleString('es-ES') : String(sets),
    heroUnit: volume > 0 ? 'kg movidos' : sets === 1 ? 'serie' : 'series',
    highlight,
    stats,
    author,
  };
}
