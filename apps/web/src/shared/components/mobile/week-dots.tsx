import type { WeekDot } from '@gymsheet/hooks';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Los siete días en círculos de 44 (`WeekDots` del móvil). `quiet`: sin
 * relleno de acento —hecho = relleno de control con ✓ en tinta de acento,
 * entreno = contorno—, para pantallas donde el acento ya es de otra pieza.
 */
export function WeekDots({ days, quiet = false }: Readonly<{ days: readonly WeekDot[]; quiet?: boolean }>) {
  return (
    <ul className="m-0 flex list-none justify-between gap-1 p-0">
      {days.map((day) => {
        const done = day.state === 'done';
        const training = day.state === 'training';
        return (
          <li
            aria-label={`${day.label}${day.today ? ', hoy' : ''}${done ? ', hecho' : ''}`}
            className={cn(
              'grid size-11 place-items-center rounded-full',
              quiet
                ? done
                  ? 'bg-[var(--surface-highest)]'
                  : 'bg-transparent'
                : done
                  ? 'bg-[var(--volt)]'
                  : training
                    ? 'bg-[var(--surface-highest)]'
                    : 'bg-transparent',
              day.today
                ? 'border-2 border-[var(--text)]'
                : quiet && training
                  ? 'border border-[var(--border)]'
                  : 'border-0',
            )}
            key={day.key}
          >
            {done ? (
              <Check
                aria-hidden
                className={cn('size-5', quiet ? 'text-[var(--accent-ink)]' : 'text-[var(--accent-contrast)]')}
              />
            ) : (
              <span
                aria-hidden
                className={cn('t-subhead', training ? 'font-semibold' : 'text-[var(--text-muted)]')}
              >
                {day.initial}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
