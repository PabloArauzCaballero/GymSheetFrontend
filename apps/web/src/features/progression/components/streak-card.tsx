import { CARD_TIERS, freezeRuleLabel, streakMilestoneLabel, streakSummary } from '@gymsheet/domain';
import { Flame, Snowflake } from 'lucide-react';
import type { PointRules, ProgressionStreak } from '@/shared/api/schemas';
import { Card, CardContent } from '@/shared/components/ui/card';
import { withAlpha } from './progression-colors';
import { ProgressTrack } from './progression-track';

/** Los hitos de racha con carta propia (contrato 12, P3). */
const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365] as const;

/** Avance dentro del tramo entre el último hito pasado y el siguiente. */
export function milestoneRatio(
  streak: Pick<ProgressionStreak, 'current' | 'nextMilestone'>,
): number {
  const previous = [...MILESTONES].reverse().find((value) => value <= streak.current) ?? 0;
  if (streak.nextMilestone === null || streak.nextMilestone <= previous) return 1;
  return (streak.current - previous) / (streak.nextMilestone - previous);
}

function days(count: number): string {
  return `${count} ${count === 1 ? 'día' : 'días'}`;
}

/**
 * La racha con sus comodines: «12 días · 1 comodín» y cuánto falta para el
 * próximo hito. Nunca culpa: una racha en cero invita a empezar hoy.
 */
export function StreakCard({
  streak,
  rules,
}: Readonly<{ streak: ProgressionStreak; rules?: PointRules }>) {
  const ice = CARD_TIERS.RARA.frame[1];
  const milestone = streakMilestoneLabel(streak);
  const maxFreezes = rules?.maxFreezes ?? 2;
  const rule = freezeRuleLabel(rules ?? {});
  const note =
    streak.current === 0
      ? 'Tu racha está en cero. Un entrenamiento hoy y vuelve a contar.'
      : streak.freezesUsed > 0
        ? `Esta racha ya usó ${streak.freezesUsed} ${streak.freezesUsed === 1 ? 'comodín' : 'comodines'}. ${rule}`
        : rule;

  return (
    <Card data-tutorial-id="progression:streak">
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--warning-bg)]">
            <Flame aria-hidden className="size-6 text-[var(--warning-text)]" />
          </span>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <h2 className="text-lg font-semibold tabular-nums tracking-[-0.01em] text-[var(--text)]">
              {streakSummary(streak)}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">{`Tu mejor racha: ${days(streak.longest)}`}</p>
          </div>
          {/* Los comodines guardados, como fichas: cuántos caben y cuántos tienes. */}
          <ul
            aria-label={`${streak.freezes} de ${maxFreezes} comodines guardados`}
            className="flex gap-1.5"
          >
            {Array.from({ length: maxFreezes }, (_, index) => {
              const has = index < streak.freezes;
              return (
                <li
                  className="grid size-8 place-items-center rounded-[8px] border"
                  key={index}
                  style={{
                    borderColor: has ? withAlpha(ice, 0.6) : 'var(--border-subtle)',
                    backgroundColor: has ? withAlpha(ice, 0.16) : 'transparent',
                  }}
                >
                  <Snowflake
                    aria-hidden
                    className="size-4"
                    style={{ color: has ? CARD_TIERS.RARA.frame[2] : 'var(--text-disabled)' }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
        {milestone ? (
          <div className="grid gap-1.5">
            <ProgressTrack
              color="var(--warning)"
              height={6}
              label="Avance hacia el próximo hito de racha"
              ratio={milestoneRatio(streak)}
            />
            <p className="text-xs text-[var(--text-muted)]">{milestone}</p>
          </div>
        ) : null}
        <p className="text-xs leading-5 text-[var(--text-muted)]">{note}</p>
      </CardContent>
    </Card>
  );
}
