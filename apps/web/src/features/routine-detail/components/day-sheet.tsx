'use client';

import { ChevronRight, Play } from 'lucide-react';
import Link from 'next/link';
import { WEEKDAY_NAMES } from '@gymsheet/hooks';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { dayTitle, lineSummary, type DayModel, type WeekModel } from '../view-model';

/**
 * La hoja del día (RF-02): los ejercicios de ese día en esa semana con sus series
 * ya ajustadas. Es una sección de la página, no un diálogo: cada ejercicio abre su
 * ficha y el botón Atrás devuelve a esta misma vista.
 */
export function DaySheet({
  week,
  day,
  onStart,
  starting,
  canStart,
}: Readonly<{
  week: WeekModel;
  day: DayModel;
  onStart?: (day: DayModel) => void;
  starting?: boolean;
  canStart: boolean;
}>) {
  const title = dayTitle(day, (dia) => WEEKDAY_NAMES[dia]);
  const weekday = day.diaSemana ? WEEKDAY_NAMES[day.diaSemana as keyof typeof WEEKDAY_NAMES] : null;
  return (
    <section aria-labelledby="day-sheet-title" className="panel overflow-hidden" data-testid="day-sheet">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] p-5">
        <div className="grid gap-1">
          <p className="data-label text-[var(--text-muted)]">
            Semana {week.numero}
            {weekday && weekday !== title ? ` · ${weekday}` : ''}
          </p>
          <h2 className="text-xl font-semibold tracking-[-0.02em]" id="day-sheet-title">
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {week.esDescarga ? (
            <Badge latido={false} tone="warning">
              Descarga
            </Badge>
          ) : null}
          {canStart && onStart ? (
            <Button loading={starting} onClick={() => onStart(day)} size="sm" variant="primary">
              <Play aria-hidden className="size-4" />
              Empezar este día
            </Button>
          ) : null}
        </div>
      </header>
      {day.ejercicios.length === 0 ? (
        <p className="p-5 text-sm text-[var(--text-muted)]">Este día todavía no tiene ejercicios.</p>
      ) : (
        <ol className="list-none divide-y divide-[var(--border-subtle)]">
          {day.ejercicios.map((line, index) => (
            <li key={line.routineExerciseId}>
              <Link
                className="flex items-center gap-4 p-4 transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface-low)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--volt)]"
                href={`/exercises/${line.ejercicioId}`}
              >
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--accent-ink)]"
                >
                  {index + 1}
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate font-semibold">{line.nombre}</span>
                  <span className="text-xs text-[var(--text-muted)]">{lineSummary(line)}</span>
                </span>
                <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
                <span className="sr-only">Ver la ficha del ejercicio</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
