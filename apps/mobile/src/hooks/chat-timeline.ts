import type { Message } from '@gymsheet/schemas';

/**
 * Las filas del hilo, como en WhatsApp: separadores de día («Hoy», «Ayer»,
 * «Lunes», «12 de octubre») y burbujas agrupadas cuando el mismo autor escribe
 * seguido. Lógica pura: la pantalla solo pinta lo que sale de aquí.
 *
 * La lista del chat es invertida, así que todo va del más nuevo al más viejo:
 * «más viejo» es el siguiente del arreglo y en pantalla queda encima.
 */
export type ChatDayRow = { kind: 'day'; key: string; label: string };
export type ChatMessageRow = {
  kind: 'message';
  key: string;
  message: Message;
  /** El de encima es del mismo autor, del mismo día y de hace poco: se pegan. */
  groupedWithOlder: boolean;
  /** El de debajo sigue el grupo: esta burbuja no lleva colita. */
  groupedWithNewer: boolean;
};
export type ChatRow = ChatDayRow | ChatMessageRow;

/** Más de 10 minutos entre dos mensajes del mismo autor ya es otro grupo. */
export const GROUP_GAP_MS = 10 * 60_000;

const WEEKDAY = new Intl.DateTimeFormat('es', { weekday: 'long' });
const DAY_MONTH = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** `2026-10-18` en la zona del teléfono: dos mensajes son del mismo día si comparten esta clave. */
export function localDayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'sin-fecha';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function capitalize(text: string): string {
  return text ? text[0]!.toUpperCase() + text.slice(1) : text;
}

/** «Hoy», «Ayer», el día de la semana si fue esta semana, y la fecha si no. */
export function dayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return capitalize(WEEKDAY.format(date));
  return (date.getFullYear() === now.getFullYear() ? DAY_MONTH : DAY_MONTH_YEAR).format(date);
}

function groupable(a: Message | undefined, b: Message | undefined): boolean {
  if (!a || !b || a.type === 'system' || b.type === 'system') return false;
  if (a.senderId !== b.senderId) return false;
  if (localDayKey(a.createdAt) !== localDayKey(b.createdAt)) return false;
  return Math.abs(Date.parse(a.createdAt) - Date.parse(b.createdAt)) <= GROUP_GAP_MS;
}

/**
 * `timeline` va del más nuevo al más viejo. El separador de un día queda
 * encima de su primer mensaje: en el arreglo invertido, justo después del más
 * viejo de ese día.
 */
export function buildChatRows(timeline: readonly Message[], now = new Date()): ChatRow[] {
  const rows: ChatRow[] = [];
  timeline.forEach((message, index) => {
    const newer = timeline[index - 1];
    const older = timeline[index + 1];
    rows.push({
      kind: 'message',
      key: message.id,
      message,
      groupedWithOlder: groupable(message, older),
      groupedWithNewer: groupable(message, newer),
    });
    const day = localDayKey(message.createdAt);
    if (!older || localDayKey(older.createdAt) !== day) {
      rows.push({ kind: 'day', key: `day:${day}`, label: dayLabel(message.createdAt, now) });
    }
  });
  return rows;
}

/** Dónde está un mensaje dentro de las filas (para saltar a él al tocar una cita). */
export function rowIndexOf(rows: readonly ChatRow[], messageId: string): number {
  return rows.findIndex((row) => row.kind === 'message' && row.message.id === messageId);
}
