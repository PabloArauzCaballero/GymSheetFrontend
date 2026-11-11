import { relativeTimeEs } from '../routine-community/relative-time.ts';

/**
 * Antigüedades de Mensajes en frases que se leen bien en cualquier rango.
 *
 * `relativeTimeEs` devuelve «5 min», «2 h», «3 d», «4 sem» o, pasado un año,
 * una fecha («12 oct 2025»). Pegarle un «hace» delante funcionaba hasta el
 * año y luego producía «Hace 12 oct 2025» — se vio con datos del peor caso.
 */
const UNIT = /^\d+ (min|h|d|sem)$/;

/** «Ahora», «Hace 2 h», «El 12 oct 2025». */
export function sinceLabel(iso: string, now?: Date): string {
  const since = relativeTimeEs(iso, now);
  if (since === 'ahora') return 'Ahora';
  return UNIT.test(since) ? `Hace ${since}` : `El ${since}`;
}

/**
 * «Conectados ahora», «Conectados hace 4 d», «Desde oct 2025». Pasado un año
 * basta el mes: el día no aporta y en un iPhone SE no cabía.
 */
export function connectedSince(iso: string, now?: Date): string {
  const since = relativeTimeEs(iso, now);
  if (since === 'ahora') return 'Conectados ahora';
  if (UNIT.test(since)) return `Conectados hace ${since}`;
  const month = new Date(iso).toLocaleDateString('es', { month: 'short', year: 'numeric' }).replace('.', '');
  return `Desde ${month}`;
}
