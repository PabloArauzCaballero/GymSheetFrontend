import { exerciseGroupLabelEs, type TrainingSummary } from '@gymsheet/domain';

/**
 * Reparto de series por músculo de esta semana (`MuscleSplit` del móvil):
 * cuatro barras en tono neutro, la mayor al 100 %.
 */
export function MuscleSplit({ week }: Readonly<{ week: TrainingSummary['thisWeek'] }>) {
  const top = week.muscles[0]?.sets ?? 1;
  return (
    <div className="panel grid gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="t-headline">Músculos de esta semana</h3>
        <span className="t-footnote tabular-nums text-[var(--text-muted)]">{`${week.sets} series`}</span>
      </div>
      {week.muscles.length === 0 ? (
        <p className="t-subhead text-[var(--text-muted)]">
          Aún no hay series esta semana. Lo que entrenes aparecerá aquí, repartido por músculo.
        </p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {week.muscles.slice(0, 4).map((muscle) => {
            const name = exerciseGroupLabelEs(muscle.name) || muscle.name;
            return (
              <li className="grid gap-1" key={muscle.name}>
                <div className="flex justify-between gap-2">
                  <span className="t-footnote truncate text-[var(--text-muted)]">{name}</span>
                  <span className="t-footnote font-semibold tabular-nums">{muscle.sets}</span>
                </div>
                <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-[var(--surface-highest)]">
                  <span
                    className="block h-full rounded-full bg-[var(--text-muted)]"
                    style={{ width: `${Math.max(6, (muscle.sets / top) * 100)}%` }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
