import { formatDate } from '@/shared/lib/date';

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('es', { weekday: 'short' });
const LONG_DAY_FORMAT = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function daysAgo(date: Date): number {
  return Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
}

/** `14:32`. Es lo que distingue dos mensajes del mismo día. */
export function formatTimeOfDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * `14:32` hoy, `ayer` el día anterior, `Lun` dentro de la semana y una fecha
 * corta más allá — la misma escalada que usa cualquier lista de chats, para que
 * la conversación más reciente se lea de un vistazo sin abrirla.
 *
 * Es la misma función que `chatTimestampLabel` en el móvil, con las mismas
 * palabras: una lista de chats que cuenta el tiempo distinto según el
 * dispositivo se lee como dos productos.
 */
export function chatTimestampLabel(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const days = daysAgo(date);
  if (days === 0) return formatTimeOfDay(iso);
  if (days === 1) return 'ayer';
  if (days < 7) {
    const label = WEEKDAY_FORMAT.format(date);
    return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '');
  }
  return formatDate(iso);
}

/** El separador entre días dentro de un hilo: «Hoy», «Ayer» o la fecha larga. */
export function dayDividerLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const days = daysAgo(date);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return LONG_DAY_FORMAT.format(date);
}

/**
 * «En línea» / «Últ. vez hoy a las 14:32» / … — el mismo criterio que el móvil:
 * estar en línea gana a cualquier fecha, y sin ningún `lastSeenAt` (una cuenta
 * que nunca cerró un socket) no se inventa una hora.
 */
export function presenceLabel(online: boolean, lastSeenAt: string | null): string {
  if (online) return 'En línea';
  if (!lastSeenAt) return 'Sin conexión reciente';
  const date = new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) return 'Sin conexión reciente';
  const days = daysAgo(date);
  if (days === 0) return `Últ. vez hoy a las ${formatTimeOfDay(lastSeenAt)}`;
  if (days === 1) return `Últ. vez ayer a las ${formatTimeOfDay(lastSeenAt)}`;
  return `Últ. vez el ${formatDate(lastSeenAt)}`;
}
