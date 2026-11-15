import type { Progression } from '@/shared/api/schemas';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { plural } from './profile-hero';

/** Points, streak and sessions from the real progression: what the hero shows and what sharing brags about. */
export function fitnessNumbers(progress: Pick<Progression, 'points' | 'streak' | 'stats'>) {
  return { points: progress.points, streak: progress.streak?.current ?? progress.stats.currentStreakDays, sessions: progress.stats.totalSessions };
}

/**
 * La identidad de gimnasio bajo el nombre (`fitness-row` del móvil): puntos ·
 * racha · sesiones en tres columnas iguales, cifras neutras. La fila siempre
 * ocupa lo mismo: cargando, la cifra es una silueta; si falló, una raya (el
 * reintento está en la tarjeta de la senda). Nada salta al llegar el dato.
 */
export function FitnessRow({ progress, pending }: Readonly<{ progress: Progression | undefined; pending: boolean }>) {
  const numbers = progress ? fitnessNumbers(progress) : null;
  const stats = [
    { key: 'points', value: numbers?.points ?? null, label: 'puntos' },
    { key: 'streak', value: numbers?.streak ?? null, label: numbers ? plural(numbers.streak, 'día de racha', 'días de racha') : 'días de racha' },
    { key: 'sessions', value: numbers?.sessions ?? null, label: numbers ? plural(numbers.sessions, 'sesión', 'sesiones') : 'sesiones' },
  ];
  return (
    <dl aria-busy={pending || undefined} className="grid w-full grid-cols-3 divide-x divide-[var(--border)]" data-testid="profile-fitness-row">
      {stats.map((stat) => (
        <div className="grid min-w-0 justify-items-center gap-0.5 px-1 text-center" key={stat.key}>
          <dt className="t-footnote text-balance text-[var(--text-muted)]">{stat.label}</dt>
          <dd className="t-numeric order-first">
            {stat.value !== null ? (
              stat.value.toLocaleString('es-ES')
            ) : pending ? (
              <Skeleton className="h-[1lh] w-10" />
            ) : (
              <span className="text-[var(--text-muted)]">
                <span aria-hidden>—</span>
                <span className="sr-only">No disponible</span>
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
