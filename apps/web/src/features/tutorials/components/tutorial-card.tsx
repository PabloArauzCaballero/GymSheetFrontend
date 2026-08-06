'use client';

import { Clock, Lock, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { useTutorial } from '../engine/tutorial-context';
import type { ResolvedTutorial } from '../model/types';
import { categoryLabels, difficultyLabels, statusLabels, statusTone } from './labels';

/**
 * A single tutorial in the Center. Reflects progress, prerequisites and version
 * changes, and exposes the right primary action (start / continue / replay).
 */
export function TutorialCard({ tutorial }: Readonly<{ tutorial: ResolvedTutorial }>) {
  const { statusOf, isOutdated, prerequisitesMet, pendingPrerequisites, repeatCountOf, start, reset } =
    useTutorial();

  const status = statusOf(tutorial.id);
  const outdated = isOutdated(tutorial.id);
  const locked = !prerequisitesMet(tutorial.id);
  const pending = pendingPrerequisites(tutorial.id);
  const repeats = repeatCountOf(tutorial.id);

  const primaryLabel =
    status === 'IN_PROGRESS'
      ? 'Continuar'
      : status === 'COMPLETED'
        ? 'Repetir'
        : status === 'SKIPPED'
          ? 'Retomar'
          : 'Comenzar';

  return (
    <Card
      className="flex h-full flex-col gap-4 p-5"
      data-tutorial-id={`tutorial-card:${tutorial.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone[status]}>{statusLabels[status]}</Badge>
        {tutorial.mandatory ? <Badge tone="warning">Obligatorio</Badge> : null}
        {tutorial.recommended ? <Badge tone="info">Recomendado</Badge> : null}
        {outdated ? <Badge tone="warning">Actualizado</Badge> : null}
      </div>

      <div className="flex-1">
        <h3 className="text-base font-bold tracking-[-0.01em]">{tutorial.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{tutorial.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Sparkles aria-hidden className="size-3.5" />
          {categoryLabels[tutorial.category]}
        </span>
        <span>{difficultyLabels[tutorial.difficulty]}</span>
        <span className="inline-flex items-center gap-1">
          <Clock aria-hidden className="size-3.5" />
          {tutorial.estimatedMinutes} min
        </span>
        <span>{tutorial.steps.length} pasos</span>
        {repeats > 0 ? <span>{repeats}× repetido</span> : null}
      </div>

      {locked ? (
        <p className="inline-flex items-start gap-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>Completa primero: {pending.join(', ')}</span>
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={locked}
          onClick={() => start(tutorial.id, { restart: status === 'COMPLETED' })}
        >
          <Play className="size-4" />
          {primaryLabel}
        </Button>
        {status !== 'NOT_STARTED' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => reset(tutorial.id)}
            aria-label={`Reiniciar progreso de ${tutorial.title}`}
          >
            <RotateCcw className="size-4" />
            Reiniciar
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
