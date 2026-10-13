/** Converts a browser-local datetime input to the explicit offset the API requires. */
export function localInviteTime(value: string, timeZone: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error('Elige una fecha y hora válidas.');
  }

  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) throw new Error('Elige una fecha y hora válidas.');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    throw new Error('Esa hora local no existe por el cambio horario. Elige otra.');
  }

  let zoneIsValid = false;
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone }).formatToParts(date);
    zoneIsValid = parts.length > 0;
  } catch {
    zoneIsValid = false;
  }
  if (!zoneIsValid) throw new Error('No se pudo determinar la zona horaria local.');

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(absoluteOffset / 60)).padStart(2, '0')}:${String(absoluteOffset % 60).padStart(2, '0')}`;
  return `${value}:00${offset}`;
}
