import type { LeaderboardEntry, LeaderboardSortBy } from '@/shared/api/schemas';
import { CountUp } from '@/shared/components/motion/count-up';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/cn';

const WEEKDAY_LABELS: ReadonlyArray<{ value: number; short: string }> = [
  { value: 1, short: 'L' },
  { value: 2, short: 'M' },
  { value: 3, short: 'X' },
  { value: 4, short: 'J' },
  { value: 5, short: 'V' },
  { value: 6, short: 'S' },
  { value: 7, short: 'D' },
];

export function RestDaysCard({
  currentRestDays,
  pending,
  onToggle,
}: Readonly<{ currentRestDays: number[]; pending: boolean; onToggle: (day: number) => void }>) {
  return (
    <Card>
      <CardHeader
        description={
          currentRestDays.length >= 6
            ? 'Los días marcados no rompen tu racha. Ya tienes seis. El séptimo no se puede marcar: sin ningún día de entreno, la racha dejaría de significar algo.'
            : 'Los días marcados no rompen tu racha. Puedes marcar hasta seis.'
        }
        title="Días de descanso"
      />
      <CardContent className="flex flex-wrap gap-2">
        {WEEKDAY_LABELS.map((day) => (
          <button
            aria-pressed={currentRestDays.includes(day.value)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
              currentRestDays.includes(day.value)
                // `--accent-contrast` (#000000 en ambos temas) es el token para texto
                // encima del relleno de acento. Con `--background` la letra del día
                // desaparecía en claro: #f3f4f0 sobre el volt #c3f400 son 1.17:1, así
                // que no se veía QUÉ días estaban marcados. En oscuro `--background`
                // es negro y por eso el fallo no se notaba al desarrollar.
                ? 'border-[var(--volt)] bg-[var(--volt)] text-[var(--accent-contrast)]'
                : 'border-[var(--border-subtle)] text-[var(--text-muted)]',
            )}
            disabled={pending}
            key={day.value}
            onClick={() => onToggle(day.value)}
            type="button"
          >
            {day.short}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

const SORT_OPTIONS: ReadonlyArray<{ value: LeaderboardSortBy; label: string }> = [
  { value: 'points', label: 'Puntos' },
  { value: 'streak', label: 'Racha' },
];

export function LeaderboardCard({
  entries,
  sortBy,
  onSortChange,
}: Readonly<{
  entries: LeaderboardEntry[];
  sortBy: LeaderboardSortBy;
  onSortChange: (sort: LeaderboardSortBy) => void;
}>) {
  return (
    <Card>
      <CardHeader
        action={
          <div className="flex gap-1 rounded-full bg-[var(--surface-high)] p-1 text-xs">
            {SORT_OPTIONS.map((option) => (
              <button
                aria-pressed={sortBy === option.value}
                className={cn(
                  'rounded-full px-3 py-1 font-medium transition-colors',
                  sortBy === option.value
                    ? 'bg-[var(--volt)] text-[var(--accent-contrast)]'
                    : 'text-[var(--text-muted)]',
                )}
                key={option.value}
                onClick={() => onSortChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        }
        description="Los cinco primeros de tu gimnasio. Solo se ve el nombre y la inicial."
        title="Clasificación del gimnasio"
      />
      <CardContent className="grid gap-3">
        {entries.map((entry, index) => (
          <div className="flex items-center gap-4" key={`${entry.position}-${entry.displayName}`}>
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                entry.isMe
                  ? 'bg-[var(--volt)] text-[var(--accent-contrast)]'
                  : 'bg-[var(--surface-high)] text-[var(--text-muted)]',
              )}
            >
              {entry.position}
            </span>
            <span
              className={cn(
                'flex-1 truncate text-sm',
                entry.isMe ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]',
              )}
            >
              {entry.displayName}
              {entry.isMe ? ' · tú' : ''}
            </span>
            {sortBy === 'streak' ? (
              <span className="text-sm text-[var(--text-muted)] tabular-nums">
                {`${entry.streakDays} ${entry.streakDays === 1 ? 'día' : 'días'}`}
              </span>
            ) : (
              <span className="text-sm text-[var(--text-muted)]">
                {/* Escalonado en el orden de lectura: el podio se llena de arriba abajo. */}
                <span aria-hidden>
                  <CountUp delayMs={index * 60} value={entry.points} />
                </span>
                <span className="sr-only">{`${entry.points.toLocaleString('es-ES')} puntos`}</span>
              </span>
            )}
          </div>
        ))}
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Todavía no hay nadie en la tabla. Entrena y sé el primero.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
