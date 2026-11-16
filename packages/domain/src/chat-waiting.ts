/**
 * The glowing dot on Chat (tab, sidebar, profile row): how many matches are
 * waiting for my reply (`GET /me/conversations/pending-replies`). There is no
 * per-message unread count in the API, so the dot speaks of chats, not of
 * messages — saying «mensajes sin leer» would claim a number we do not have.
 */
export function chatWaitingLabel(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? '1 chat espera tu respuesta' : `${count.toLocaleString('es-ES')} chats esperan tu respuesta`;
}

/** The figure inside the dot: up to 9, then «9+» (same cap as the tab badges). */
export function chatDotFigure(count: number): string {
  return count > 9 ? '9+' : String(Math.max(count, 0));
}

/**
 * The dot pulses only when something new arrived: the count went up since the
 * last read the screen saw. The first read (`previous === null`) never pulses,
 * so opening the app does not start motion for news the person already knew.
 */
export function chatShouldPulse(previous: number | null, next: number): boolean {
  return previous !== null && next > previous;
}
