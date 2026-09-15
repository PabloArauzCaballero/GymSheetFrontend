'use client';

import { pointRuleLines, pointsFigures, type PointRuleLine } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { Award, CheckCheck, Dumbbell, Flame, Layers, type LucideIcon } from 'lucide-react';
import type { ProgressionBadge, ProgressionStats } from '@/shared/api/schemas';
import { progressionService } from '@/features/progression/services/progression-service';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/shared/components/ui/dialog';

/**
 * «Cómo se ganan los puntos», con tus cifras al lado de cada regla.
 *
 * Gemelo de `apps/mobile/src/components/points-rules-sheet.tsx`: mismas líneas,
 * misma cuenta (`pointsFigures` del dominio) y mismas tarifas, que llegan del
 * servidor y nunca se copian aquí.
 */

const ICON: Record<PointRuleLine['key'], LucideIcon> = {
  session: CheckCheck,
  sets: Layers,
  volume: Dumbbell,
  streak: Flame,
  badges: Award,
};

function format(value: number): string {
  return value.toLocaleString('es-ES');
}

export function usePointRules() {
  return useQuery({
    queryKey: ['progression', 'rules'],
    queryFn: progressionService.rules,
    // Las tarifas cambian, si cambian, una vez por temporada.
    staleTime: 60 * 60_000,
  });
}

export function PointsRulesDialog({
  open,
  onOpenChange,
  points,
  stats,
  badges,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  points: number;
  stats: ProgressionStats;
  badges: readonly ProgressionBadge[];
}>) {
  const rules = usePointRules();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent description="Cada regla con tus números al lado." title="Cómo se ganan los puntos">
        <div className="grid gap-5">
          {rules.isPending ? (
            <div
              aria-label="Cargando las reglas…"
              className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-high)] motion-reduce:animate-none"
              role="status"
            />
          ) : rules.isError ? (
            <div className="grid gap-3">
              <p className="text-sm text-[var(--text-muted)]">
                No pudimos cargar las reglas. Vuelve a intentarlo en un momento.
              </p>
              <Button className="justify-self-start" onClick={() => void rules.refetch()} variant="secondary">
                Reintentar
              </Button>
            </div>
          ) : (
            <RuleList
              figures={pointsFigures(rules.data, stats, badges)}
              lines={pointRuleLines(rules.data)}
              points={points}
            />
          )}
          <DialogClose asChild>
            <Button className="justify-self-end" variant="primary">
              Entendido
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RuleList({
  lines,
  figures,
  points,
}: Readonly<{
  lines: ReturnType<typeof pointRuleLines>;
  figures: ReturnType<typeof pointsFigures>;
  points: number;
}>) {
  return (
    <div className="grid gap-4">
      <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)]">
        {lines.map((line) => {
          const Icon = ICON[line.key];
          const figure = figures[line.key];
          return (
            <li className="flex items-center gap-4 p-4" key={line.key}>
              <Icon aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-sm font-semibold text-[var(--text)]">{line.label}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {`${line.rate} · Tú: ${figure.detail}`}
                </span>
              </div>
              <span className="text-base font-semibold tabular-nums text-[var(--text)]">
                {format(figure.total)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="flex items-baseline justify-between px-4">
        <span className="text-sm text-[var(--text-muted)]">Tu total</span>
        <span className="text-xl font-semibold tabular-nums text-[var(--accent-ink)]">
          {`${format(points)} puntos`}
        </span>
      </p>
      <p className="text-xs leading-5 text-[var(--text-muted)]">
        Los puntos nunca bajan. La racha cuenta la más larga que hayas hecho, así que descansar no te
        quita nada.
      </p>
    </div>
  );
}
