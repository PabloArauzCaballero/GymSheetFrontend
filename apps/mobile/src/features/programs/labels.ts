/** Chip corto de cada modo de programa. */
export const MODE_BADGE: Record<string, string> = {
  NONE: 'Normal',
  PROGRESSIVE_OVERLOAD: 'Sobrecarga',
  STRENGTH_GOALS: 'Metas',
  CARDIO: 'Cardio',
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/**
 * `2026-12-05` → `5 dic`. Se parte la cadena: un `Date` movería la fecha un día
 * según la zona, y una fecha de calendario (`YYYY-MM-DD`) no tiene hora.
 */
export function formatDateOnly(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(isoDate);
  if (!match) return isoDate;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month}` : isoDate;
}

/** «Hoy: Pierna». Si el día no tiene nombre, o se llama igual que la etiqueta, no se repite («Hoy: Hoy»). */
export function dayLabel(label: string, name: string | null | undefined): string {
  const clean = name?.trim();
  if (!clean || clean.toLowerCase() === label.toLowerCase()) return label;
  return `${label}: ${clean}`;
}
