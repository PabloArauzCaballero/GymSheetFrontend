'use client';

import { Segmented } from '@/shared/components/ui/segmented';
import { findDay, isAnyDayRoutine, type DayModel, type WeekModel } from '../view-model';
import type { DetailView } from '../view-state';
import { DaySheet } from './day-sheet';
import { MonthView } from './month-view';
import { WeekView } from './week-view';

/**
 * Semana / Mes de la rutina y la hoja del día elegido (RF-02). La vista, la
 * semana y el día viven en la URL, así que volver de una ficha cae en el mismo sitio.
 */
export function CalendarSection({
  weeks,
  view,
  onView,
  onStartDay,
  startingDayId,
  canStart,
  isOwner,
  showCommunity,
}: Readonly<{
  weeks: readonly WeekModel[];
  view: DetailView;
  onView: (patch: Partial<DetailView>) => void;
  onStartDay: (day: DayModel) => void;
  startingDayId: string | null;
  canStart: boolean;
  isOwner: boolean;
  showCommunity: boolean;
}>) {
  const week = weeks.find((candidate) => candidate.numero === view.semana) ?? weeks[0];
  if (!week) return null;
  const anyDay = isAnyDayRoutine(weeks);
  // En Semana siempre hay un día a la vista; en Mes la hoja aparece al tocar una celda.
  const fallback = view.vista === 'semana' ? (week.dias[0] ?? null) : null;
  const selected = findDay(week, view.dia) ?? fallback;
  return (
    <section aria-labelledby="calendar-title" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-[-0.02em]" id="calendar-title">
          {anyDay ? 'Rutina de un día (cualquier día)' : 'Calendario'}
        </h2>
        {anyDay || weeks.length < 2 ? null : (
          <Segmented
            label="Vista del calendario"
            onChange={(vista) => onView({ vista })}
            options={[
              { value: 'semana', label: 'Semana' },
              { value: 'mes', label: 'Mes' },
            ]}
            value={view.vista}
          />
        )}
      </div>
      {view.vista === 'mes' && !anyDay ? (
        <MonthView
          onSelect={(chosenWeek, day) => onView({ semana: chosenWeek.numero, dia: day.diaId })}
          selectedDayId={selected?.diaId ?? null}
          selectedWeek={week.numero}
          weeks={weeks}
        />
      ) : (
        <WeekView
          onChangeWeek={(semana) => onView({ semana })}
          onSelectDay={(day) => onView({ dia: day.diaId })}
          selectedDayId={selected?.diaId ?? null}
          totalWeeks={weeks.length}
          week={week}
        />
      )}
      {selected ? (
        <DaySheet
          canStart={canStart}
          day={selected}
          isOwner={isOwner}
          showCommunity={showCommunity}
          onStart={onStartDay}
          starting={startingDayId === selected.diaId}
          week={week}
        />
      ) : view.vista === 'mes' ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--text-muted)]">
          Toca un día del calendario para ver sus ejercicios.
        </p>
      ) : null}
    </section>
  );
}
