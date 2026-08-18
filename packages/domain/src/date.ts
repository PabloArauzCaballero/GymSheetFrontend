const dateFormatter = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'medium',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Fecha de calendario sin hora, tal como la emite el backend para DATEONLY. */
const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/u;

/**
 * Una fecha de calendario no tiene instante: `new Date('2026-08-17')` la
 * interpreta como medianoche UTC y, al formatearla en una zona negativa como
 * la de Bolivia (UTC-4), retrocede al día anterior. Se construye entonces en
 * hora local para que el día mostrado sea el que el backend guardó. Las marcas
 * de tiempo completas sí llevan instante y se dejan intactas.
 */
function parseDateValue(value: string | Date): Date {
  if (value instanceof Date) return value;
  const parts = dateOnlyPattern.exec(value);
  if (!parts) return new Date(value);
  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = parseDateValue(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function formatDuration(start: string, end?: string | null) {
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return '—';
  const seconds = Math.floor((to - from) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}
