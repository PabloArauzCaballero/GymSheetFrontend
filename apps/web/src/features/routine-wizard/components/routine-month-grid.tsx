'use client';

import {
  WEEKDAYS,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  countLabel,
  type MonthColumn,
  type PlannedWeek,
} from '@gymsheet/hooks';
import { cn } from '@/shared/lib/cn';

function cellText(column: MonthColumn): string {
  if (!column.entrena) return '';
  return column.nombre ? column.nombre.slice(0, 3) : '•';
}

/**
 * Vista Mes: una tabla accesible con una fila por semana y una columna por día de
 * la semana. La semana de descarga se atenúa Y lleva la etiqueta «Descarga» (el
 * estado nunca depende solo del color). Cada fila se activa con un botón que
 * nombra la semana, así que se maneja con teclado.
 */
export function RoutineMonthGrid({
  semanas,
  columnas,
  seleccionada,
  onSelectWeek,
}: Readonly<{
  semanas: readonly PlannedWeek[];
  columnas: readonly MonthColumn[];
  seleccionada?: number | null;
  onSelectWeek?: (numero: number) => void;
}>) {
  return (
    <div className="overflow-x-auto">
      <table
        aria-label="Vista Mes"
        className="w-full table-fixed border-separate border-spacing-y-1 text-sm"
      >
        <thead>
          <tr>
            <th className="w-16 text-left sm:w-24" scope="col">
              <span className="sr-only">Semana</span>
            </th>
            {WEEKDAYS.map((dia) => (
              <th
                className="text-center text-xs font-semibold text-[var(--text-muted)]"
                key={dia}
                scope="col"
              >
                <abbr title={WEEKDAY_NAMES[dia]}>{WEEKDAY_SHORT[dia]}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((week) => {
            const selected = seleccionada === week.numero;
            const summary = columnas
              .filter((column) => column.entrena)
              .map(
                (column) =>
                  `${WEEKDAY_NAMES[column.dia].toLowerCase()}${column.nombre ? ` ${column.nombre}` : ''} ${countLabel(column.ejercicios)}`,
              )
              .join(', ');
            return (
              <tr
                className={cn(
                  'rounded-[var(--radius-md)]',
                  week.esDescarga
                    ? 'bg-[var(--surface-high)] opacity-80'
                    : 'bg-[var(--surface-low)]',
                  selected && 'outline outline-2 outline-[var(--volt)]',
                )}
                data-testid={`week-row-${week.numero}`}
                key={week.numero}
              >
                <th className="p-0 text-left" scope="row">
                  <button
                    aria-label={`Semana ${week.numero}${week.esDescarga ? ', descarga' : ''}. ${summary}`}
                    aria-pressed={selected}
                    className="flex min-h-11 w-full flex-col items-start justify-center px-3 text-left font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
                    onClick={() => onSelectWeek?.(week.numero)}
                    type="button"
                  >
                    <span>{`S${week.numero}`}</span>
                    {week.esDescarga ? (
                      <span className="text-[10px] font-semibold text-[var(--warning-text)]">
                        Descarga
                      </span>
                    ) : null}
                  </button>
                </th>
                {columnas.map((column) => (
                  <td
                    aria-hidden
                    className={cn(
                      'text-center text-xs',
                      column.entrena && 'bg-[rgb(var(--accent-channels)/0.14)]',
                    )}
                    key={column.dia}
                  >
                    {cellText(column)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
