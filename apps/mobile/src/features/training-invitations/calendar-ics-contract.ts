/** Extracts the server-issued UID, including RFC 5545 folded lines. */
export function calendarUid(ics: string): string {
  const unfolded = ics.replace(/\r\n[ \t]/gu, '');
  if (!unfolded.startsWith('BEGIN:VCALENDAR\r\n') ||
      !unfolded.includes('\r\nBEGIN:VEVENT\r\n') ||
      !unfolded.includes('\r\nEND:VEVENT\r\n') ||
      !unfolded.endsWith('END:VCALENDAR\r\n')) {
    throw new Error('El servidor no devolvió un calendario válido.');
  }
  const matches = [...unfolded.matchAll(/(?:^|\r\n)UID:([^\r\n]+)/gu)];
  if (matches.length !== 1 || !matches[0]?.[1]?.trim()) {
    throw new Error('El calendario no tiene un identificador de evento único.');
  }
  return matches[0][1];
}
