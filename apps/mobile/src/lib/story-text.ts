/** Topes del pie de foto: los mismos que valida el backend. */
export const STORY_CAPTION_MAX_LENGTH = 200;
export const STORY_CAPTION_MAX_LINES = 4;

/**
 * El pie tal y como se enviará: sin espacios en los extremos, con los saltos
 * de línea normalizados y sin pasarse de líneas. Vacío es «sin texto» (`null`).
 */
export function normalizeStoryCaption(raw: string): string | null {
  const lines = raw.replace(/\r\n?/gu, '\n').split('\n').slice(0, STORY_CAPTION_MAX_LINES);
  const text = lines.join('\n').trim();
  if (text === '') return null;
  return [...text].slice(0, STORY_CAPTION_MAX_LENGTH).join('');
}

/**
 * Cuánto le queda a una story propia, en corto: «Quedan 5 h», «Quedan 12 min».
 * `null` si la fecha no se entiende o ya caducó (el feed la quitará enseguida).
 */
export function storyTimeLeftLabel(expiresAt: string | null | undefined, now: number = Date.now()): string | null {
  if (!expiresAt) return null;
  const end = Date.parse(expiresAt);
  if (Number.isNaN(end)) return null;
  const minutes = Math.floor((end - now) / 60_000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `Quedan ${minutes} min`;
  return `Quedan ${Math.floor(minutes / 60)} h`;
}
