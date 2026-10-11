'use client';

import { Play } from 'lucide-react';
import { WEEKDAY_NAMES } from '@gymsheet/hooks';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { dayTitle, type DayModel, type WeekModel } from '../view-model';
import { DayBlocksList } from './day-blocks-list';

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
  isOwner,
  showCommunity,
}: Readonly<{
  week: WeekModel;
  day: DayModel;
  onStart?: (day: DayModel) => void;
  starting?: boolean;
  canStart: boolean;
  /** Quien mira es la autora de la rutina (y de sus ejercicios propios). */
  isOwner: boolean;
  /** Los ejercicios privados de una rutina pública se valoran, se comentan y se denuncian (D3). */
  showCommunity: boolean;
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
        <DayBlocksList isOwner={isOwner} lines={day.ejercicios} showCommunity={showCommunity} />
      )}
    </section>
  );
}
