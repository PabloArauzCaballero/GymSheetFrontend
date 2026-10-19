import type { SessionComparison, SessionRecord } from '@gymsheet/domain';

const kg = (value: number) => `${value.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg`;

/**
 * El texto que sale al pulsar «Compartir» en el resumen (marketing-ideas #93
 * y #87: lo firma `shareWithBrand`). Solo cifras que la sesión trae; lo que no
 * se sabe no se escribe. Primera persona: lo manda quien entrenó.
 */
export function sessionShareLines({
  title,
  volumeKg,
  sets,
  duration,
  comparison,
  records,
  pointsEarned,
}: {
  title: string | null;
  volumeKg: number;
  sets: number;
  duration: string | null;
  comparison: SessionComparison | null;
  records: readonly SessionRecord[];
  pointsEarned: number | null;
}): string[] {
  const volume = Math.round(volumeKg);
  const lead = volume > 0 ? `${volume.toLocaleString('es-ES')} kg movidos` : `${sets} ${sets === 1 ? 'serie' : 'series'}`;
  const lines = [
    title ? `Acabo de terminar ${title}.` : 'Acabo de terminar mi sesión.',
    duration ? `${lead} en ${duration}.` : `${lead}.`,
  ];
  if (comparison?.direction === 'up') lines.push(`+${Math.abs(comparison.changePct)} % frente a mi última sesión.`);
  if (records.length > 0) {
    lines.push(records.length === 1 ? 'Nuevo récord:' : `${records.length} récords nuevos:`);
    for (const record of records.slice(0, 3)) {
      lines.push(`· ${record.exerciseName}: ${kg(record.pesoKg)} × ${record.repeticiones}`);
    }
  }
  if (pointsEarned && pointsEarned > 0) lines.push(`+${pointsEarned.toLocaleString('es-ES')} puntos en mi senda.`);
  return lines;
}
