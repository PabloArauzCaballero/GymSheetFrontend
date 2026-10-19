import { WEEKDAYS, WEEKDAY_NAMES, WEEKDAY_SHORT, countLabel } from '@gymsheet/hooks';
import { cn } from '@/shared/lib/cn';
import { dayTitle, type DayModel, type WeekModel } from '../view-model';

/**
 * Vista Mes: una tabla accesible con una fila por semana y una columna por día.
 * Cada celda con entrenamiento es un botón que nombra semana, día y número de
 * ejercicios; la semana de descarga se atenúa Y lleva la etiqueta «Descarga».
 */
export function MonthView({
  weeks,
  selectedWeek,
  selectedDayId,
  onSelect,
}: Readonly<{
  weeks: readonly WeekModel[];
  selectedWeek: number;
  selectedDayId: string | null;
  onSelect: (week: WeekModel, day: DayModel) => void;
}>) {
  return (
    <div className="overflow-x-auto">
      <table aria-label="Vista Mes" className="w-full table-fixed border-separate border-spacing-y-1 text-sm">
        <thead>
          <tr>
            <th className="w-16 text-left sm:w-24" scope="col">
              <span className="sr-only">Semana</span>
            </th>
            {WEEKDAYS.map((dia) => (
              <th className="text-center text-xs font-semibold text-[var(--text-muted)]" key={dia} scope="col">
                <abbr title={WEEKDAY_NAMES[dia]}>{WEEKDAY_SHORT[dia]}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr
              className={week.esDescarga ? 'bg-[var(--surface-high)]' : 'bg-[var(--surface-low)]'}
              data-testid={`month-week-${week.numero}`}
              key={week.numero}
            >
              <th className="px-3 py-2 text-left align-middle" scope="row">
                <span className="font-semibold">S{week.numero}</span>
                {week.esDescarga ? (
                  <span className="block text-[10px] font-semibold text-[var(--warning-text)]">Descarga</span>
                ) : null}
              </th>
              {WEEKDAYS.map((dia) => {
                const day = week.dias.find((candidate) => candidate.diaSemana === dia);
                const selected = day !== undefined && selectedWeek === week.numero && selectedDayId === day.diaId;
                return (
                  <td className="p-0.5 text-center" key={dia}>
                    {day ? (
                      <button
                        aria-label={`Semana ${week.numero}, ${WEEKDAY_NAMES[dia].toLowerCase()}, ${dayTitle(day, (value) => WEEKDAY_NAMES[value])}, ${countLabel(day.ejercicios.length)}${week.esDescarga ? ', descarga' : ''}`}
                        aria-pressed={selected}
                        className={cn(
                          'min-h-11 w-full rounded-[var(--radius-sm)] border px-0.5 text-xs font-semibold transition-colors duration-[var(--dur-1)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--volt)]',
                          selected
                            ? 'border-[var(--volt)] bg-[var(--volt)] text-[var(--accent-contrast)]'
                            : 'border-[rgb(var(--accent-channels)/0.4)] bg-[rgb(var(--accent-channels)/0.14)] text-[var(--text)] hover:bg-[rgb(var(--accent-channels)/0.24)]',
                        )}
                        onClick={() => onSelect(week, day)}
                        type="button"
                      >
                        {(day.nombre ?? WEEKDAY_SHORT[dia]).slice(0, 3)}
                      </button>
                    ) : (
                      <span aria-hidden className="text-[var(--text-muted)]">
                        ·
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
