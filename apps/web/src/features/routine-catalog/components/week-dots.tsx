import { WEEKDAYS, WEEKDAY_INITIALS, WEEKDAY_NAMES } from '@gymsheet/hooks';
import { cn } from '@/shared/lib/cn';

/**
 * Siete puntos con la inicial de cada día: los que entrena, rellenos. Es la
 * miniatura de la semana de la tarjeta. El estado no depende solo del color: el
 * día activo lleva borde y relleno, y la lista completa va en texto para quien
 * no ve la tira.
 */
export function WeekDots({ days }: Readonly<{ days: readonly (number | null)[] }>) {
  const active = new Set(days.filter((day): day is number => day !== null));
  const names = WEEKDAYS.filter((day) => active.has(day)).map((day) => WEEKDAY_NAMES[day].toLowerCase());
  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden className="flex gap-1">
        {WEEKDAYS.map((day) => (
          <span
            className={cn(
              'grid size-6 place-items-center rounded-full border text-[10px] font-semibold',
              active.has(day)
                ? 'border-[var(--volt)] bg-[rgb(var(--accent-channels)/0.16)] text-[var(--accent-ink)]'
                : 'border-[var(--border-subtle)] text-[var(--text-muted)]',
            )}
            key={day}
          >
            {WEEKDAY_INITIALS[day]}
          </span>
        ))}
      </span>
      <span className="sr-only">
        {names.length ? `Entrena: ${names.join(', ')}.` : 'Rutina de cualquier día.'}
      </span>
    </div>
  );
}
