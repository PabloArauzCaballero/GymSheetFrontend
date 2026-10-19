/**
 * Tiempo relativo corto, como en una red social: «ahora», «5 min», «2 h»,
 * «3 d», «2 sem» y, pasado un año, la fecha. Sin «hace»: va en una línea
 * pequeña junto a «Me gusta» y «Responder».
 */
export function relativeTimeEs(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (Number.isNaN(seconds)) return '';
  if (seconds < 45) return 'ahora';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d`;
  const weeks = Math.floor(days / 7);
  if (days < 365) return `${weeks} sem`;
  return then.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
