const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const FIRST_HOUR = 5;
const LAST_HOUR = 23;
/** Una hora que empieza en menos de esto ya no se ofrece para hoy. */
const MIN_LEAD_MS = 15 * 60 * 1000;

export const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

export type DayOption = { value: string; label: string; detail: string };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function localDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Hoy, Mañana y los cinco días siguientes, en hora local. */
export function dayOptions(now: Date, count = 7): DayOption[] {
  return Array.from({ length: count }, (_, offset) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const detail = `${WEEKDAYS[day.getDay()]} ${day.getDate()}`;
    const label = offset === 0 ? 'Hoy' : offset === 1 ? 'Mañana' : detail;
    return { value: localDateValue(day), label, detail };
  });
}

/** Cada media hora de 05:00 a 23:00; para hoy, solo las que aún no pasaron. */
export function timeOptions(dateValue: string, now: Date): string[] {
  const slots: string[] = [];
  for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === LAST_HOUR && minute > 0) continue;
      slots.push(`${pad(hour)}:${pad(minute)}`);
    }
  }
  if (dateValue !== localDateValue(now)) return slots;
  return slots.filter((slot) => {
    const [hour, minute] = slot.split(':').map(Number);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
    return start.getTime() - now.getTime() >= MIN_LEAD_MS;
  });
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest}` : `${hours} h`;
}
