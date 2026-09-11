const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

const STEPS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60_000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60_000 },
  { unit: 'day', ms: 24 * 60 * 60_000 },
  { unit: 'hour', ms: 60 * 60_000 },
  { unit: 'minute', ms: 60_000 },
];

/**
 * «hace 3 h», «ayer», «hace 2 meses».
 *
 * Las superficies sociales cuentan el tiempo en distancia, no en calendario:
 * una story dura un día y un like de hace diez minutos no es lo mismo que uno
 * de hace un mes. `formatDateTime` sigue siendo lo correcto donde hace falta el
 * instante exacto (historial, auditoría); aquí sobra y estorba.
 */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return '—';
  const diff = time - Date.now();
  const magnitude = Math.abs(diff);
  for (const step of STEPS) {
    if (magnitude >= step.ms) {
      return relativeFormatter.format(Math.round(diff / step.ms), step.unit);
    }
  }
  return 'hace un momento';
}
