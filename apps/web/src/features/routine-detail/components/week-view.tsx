import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WEEKDAY_NAMES, WEEKDAY_SHORT, countLabel } from '@gymsheet/hooks';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { dayTitle, weekColumns, type DayModel, type WeekModel } from '../view-model';

/**
 * Vista Semana: la semana elegida con sus siete días. Los días de entrenamiento
 * son botones que abren la hoja del día; los de descanso se quedan en texto.
 * En pantallas estrechas los días se apilan, en anchas son siete columnas.
 */
export function WeekView({
  week,
  totalWeeks,
  selectedDayId,
  onSelectDay,
  onChangeWeek,
}: Readonly<{
  week: WeekModel;
  totalWeeks: number;
  selectedDayId: string | null;
  onSelectDay: (day: DayModel) => void;
  onChangeWeek: (numero: number) => void;
}>) {
  const columns = weekColumns(week);
  const unscheduled = week.dias.filter((day) => day.diaSemana === null);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            aria-label="Semana anterior"
            disabled={week.numero <= 1}
            onClick={() => onChangeWeek(week.numero - 1)}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <p aria-live="polite" className="min-w-32 text-center text-sm font-semibold">
            Semana {week.numero} de {totalWeeks}
          </p>
          <Button
            aria-label="Semana siguiente"
            disabled={week.numero >= totalWeeks}
            onClick={() => onChangeWeek(week.numero + 1)}
            size="icon"
            variant="ghost"
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
        {week.esDescarga ? (
          <Badge latido={false} tone="warning">
            Descarga · series al {Math.round(week.factorVolumen * 100)} % y carga al{' '}
            {Math.round(week.factorCarga * 100)} %
          </Badge>
        ) : null}
      </div>

      {unscheduled.length > 0 ? (
        <ul aria-label="Días de la rutina" className="grid list-none gap-2">
          {unscheduled.map((day) => (
            <li key={day.diaId}>
              <DayButton
                day={day}
                label={dayTitle(day, (dia) => WEEKDAY_NAMES[dia])}
                selected={selectedDayId === day.diaId}
                onSelect={onSelectDay}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ol aria-label={`Días de la semana ${week.numero}`} className="grid list-none gap-2 md:grid-cols-7">
          {columns.map(({ dia, day }) => (
            <li key={dia}>
              {day ? (
                <DayButton
                  day={day}
                  label={dayTitle(day, (value) => WEEKDAY_NAMES[value])}
                  selected={selectedDayId === day.diaId}
                  weekdayShort={WEEKDAY_SHORT[dia]}
                  onSelect={onSelectDay}
                />
              ) : (
                <div className="flex min-h-14 items-center justify-between gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-muted)] md:min-h-24 md:flex-col md:items-start md:justify-start">
                  <span className="font-semibold">{WEEKDAY_SHORT[dia]}</span>
                  <span>Descanso</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function DayButton({
  day,
  label,
  weekdayShort,
  selected,
  onSelect,
}: Readonly<{
  day: DayModel;
  label: string;
  weekdayShort?: string;
  selected: boolean;
  onSelect: (day: DayModel) => void;
}>) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        'flex min-h-14 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm transition-colors duration-[var(--dur-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)] md:min-h-24 md:flex-col md:items-start md:justify-start',
        selected
          ? 'border-[var(--volt)] bg-[rgb(var(--accent-channels)/0.12)]'
          : 'border-[var(--border)] bg-[var(--surface-low)] hover:bg-[var(--surface)]',
      )}
      data-testid="day-button"
      onClick={() => onSelect(day)}
      type="button"
    >
      <span className="grid">
        {weekdayShort ? <span className="text-xs font-semibold text-[var(--text-muted)]">{weekdayShort}</span> : null}
        <span className="font-semibold">{label}</span>
      </span>
      <span className="text-xs text-[var(--text-muted)]">{countLabel(day.ejercicios.length)}</span>
    </button>
  );
}
