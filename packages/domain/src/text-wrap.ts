/** Words this short never end a line on their own («ti», «racha», «foto»). */
const ORPHAN_MAX = 6;

/**
 * Glues the last word to the previous one with a no-break space when it is
 * short, so a wrapped label never leaves a lone word on its last line. Works on
 * web and React Native alike (CSS `text-wrap: balance` does not exist on native).
 */
export function noOrphan(text: string): string {
  const trimmed = text.trimEnd();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace <= 0) return trimmed;
  if (trimmed.length - lastSpace - 1 > ORPHAN_MAX) return trimmed;
  return `${trimmed.slice(0, lastSpace)}\u00A0${trimmed.slice(lastSpace + 1)}`;
}
