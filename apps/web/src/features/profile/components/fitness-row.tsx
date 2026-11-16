import { noOrphan } from '@gymsheet/domain';
import type { Progression } from '@/shared/api/schemas';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { AwardedPoints, type PointsAward } from './points-award';
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
export function FitnessRow({ progress, pending, award = null }: Readonly<{ progress: Progression | undefined; pending: boolean; award?: PointsAward | null }>) {
  const numbers = progress ? fitnessNumbers(progress) : null;
  const stats = [
    { key: 'points', value: numbers?.points ?? null, label: 'puntos' },
    { key: 'streak', value: numbers?.streak ?? null, label: numbers ? plural(numbers.streak, 'día de racha', 'días de racha') : 'días de racha' },
    { key: 'sessions', value: numbers?.sessions ?? null, label: numbers ? plural(numbers.sessions, 'sesión', 'sesiones') : 'sesiones' },
  ];
  return (
    // Very large text (row under 14rem, which grows with the root font): one stat per line, figure then label.
    <div className="@container w-full">
    <ul aria-busy={pending || undefined} className="grid w-full grid-cols-3 divide-x divide-[var(--border)] @max-[14rem]:grid-cols-1 @max-[14rem]:gap-1 @max-[14rem]:divide-x-0" data-testid="profile-fitness-row">
      {stats.map((stat) => (
        <li className="grid min-w-0 justify-items-center gap-0.5 px-1 text-center @max-[14rem]:flex @max-[14rem]:flex-wrap @max-[14rem]:items-baseline @max-[14rem]:justify-center @max-[14rem]:gap-x-2" key={stat.key}>
          {/* Screen readers hear the mobile wording, figure first («70 puntos»); the visual parts are hidden from them. */}
          <span className="sr-only">
            {stat.value !== null ? `${stat.value.toLocaleString('es-ES')} ${stat.label}` : `${stat.label}: ${pending ? 'cargando' : 'no disponible'}`}
          </span>
          <span aria-hidden className="t-numeric">
            {stat.key === 'points' && award && stat.value !== null ? (
              <AwardedPoints award={award} key={award.key} value={stat.value} />
            ) : stat.value !== null ? (
              stat.value.toLocaleString('es-ES')
            ) : pending ? (
              <Skeleton className="h-[1lh] w-10" />
            ) : (
              <span className="text-[var(--text-muted)]">—</span>
            )}
          </span>
          {/* text-balance alone still split «días de / racha»: the no-break space keeps the last word company. */}
          <span aria-hidden className="t-footnote text-balance text-[var(--text-muted)]">{noOrphan(stat.label)}</span>
        </li>
      ))}
    </ul>
    </div>
  );
}
