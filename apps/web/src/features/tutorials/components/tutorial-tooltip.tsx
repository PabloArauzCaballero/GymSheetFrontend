'use client';

import { forwardRef } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, SkipForward, X } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { TUTORIAL_Z } from '../constants';
import type { ActiveRun } from '../engine/tutorial-context';
import type { PositionedTooltip } from '../engine/positioning';
import { TutorialProgressBar } from './tutorial-progress-bar';

export type TutorialTooltipProps = {
  run: ActiveRun;
  position: PositionedTooltip;
  reducedMotion: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  onRetry: () => void;
  titleId: string;
  descriptionId: string;
};

/**
 * The instructional bubble. Presentational: geometry comes from `position`
 * (computed by the overlay); focus/keyboard handling lives in the overlay.
 */
export const TutorialTooltip = forwardRef<HTMLDivElement, TutorialTooltipProps>(
  function TutorialTooltip(
    { run, position, reducedMotion, onNext, onPrev, onSkip, onClose, onRetry, titleId, descriptionId },
    ref,
  ) {
    const { step, tutorial, stepIndex, phase, canAdvance, isFirst, isLast } = run;
    const missing = phase === 'target-missing';

    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal={position.side === 'center'}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          'panel fixed w-[min(360px,calc(100vw-2rem))] p-5 shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)]',
          !reducedMotion && 'animate-pop',
        )}
        style={{ top: position.top, left: position.left, zIndex: TUTORIAL_Z + 2 }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <Badge tone="info">{tutorial.title}</Badge>
          <button
            type="button"
            aria-label="Cerrar tutorial"
            className="grid size-8 place-items-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 id={titleId} className="text-lg font-bold tracking-[-0.02em]">
          {step.title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {step.description}
        </p>

        {step.expectedAction ? (
          <p className="mt-3 flex items-start gap-2 rounded-[6px] border border-[var(--info-border)] bg-[var(--info-bg)] px-3 py-2 text-sm text-[var(--info-text)]">
            <ArrowRight aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{step.expectedAction}</span>
          </p>
        ) : null}

        {missing ? (
          <div className="mt-3 rounded-[6px] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2 text-sm text-[var(--warning-text)]">
            <p>No encontramos este elemento en la pantalla. Puedes reintentar, saltar este paso o cerrar la guía.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={onRetry}>
                <RotateCcw className="size-4" /> Reintentar
              </Button>
              <Button size="sm" variant="ghost" onClick={onNext}>
                Saltar paso
              </Button>
            </div>
          </div>
        ) : null}

        {step.requireAction && !canAdvance ? (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {step.advanceHint ?? 'Realiza la acción indicada para continuar.'}
          </p>
        ) : null}

        <div className="mt-4">
          <TutorialProgressBar
            current={stepIndex}
            total={tutorial.steps.length}
            reducedMotion={reducedMotion}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-xs font-semibold text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
            onClick={onSkip}
          >
            <SkipForward aria-hidden className="mr-1 inline size-3.5" />
            Omitir
          </button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onPrev} disabled={isFirst}>
              <ArrowLeft className="size-4" /> Atrás
            </Button>
            <Button size="sm" variant="primary" onClick={onNext} disabled={!canAdvance && !missing}>
              {isLast ? (
                <>
                  <Check className="size-4" /> Finalizar
                </>
              ) : (
                <>
                  Siguiente <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  },
);
