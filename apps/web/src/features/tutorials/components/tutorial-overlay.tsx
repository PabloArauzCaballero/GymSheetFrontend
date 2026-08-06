'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/components/ui/button';
import { TUTORIAL_Z } from '../constants';
import { computeTooltipPosition, type PositionedTooltip } from '../engine/positioning';
import { useReducedMotion } from '../engine/use-reduced-motion';
import { useTargetRect } from '../engine/use-target-rect';
import { useTutorial } from '../engine/tutorial-context';
import { TutorialSpotlight } from './tutorial-spotlight';
import { TutorialTooltip } from './tutorial-tooltip';

function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

/**
 * The visible tour layer. Rendered once (app-wide via the provider), it only
 * paints when a tutorial is running. Owns geometry (viewport + tooltip size →
 * position), keyboard handling (Esc/arrows), focus management and the
 * confirm-before-exit flow.
 */
export function TutorialOverlay() {
  const { activeRun, next, prev, skip, close, retryTarget } = useTutorial();
  const reducedMotion = useReducedMotion();
  const rect = useTargetRect(activeRun?.target ?? null);

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 360, height: 260 });
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });
  const [confirming, setConfirming] = useState(false);

  const titleId = useId();
  const descriptionId = useId();

  // Track viewport size.
  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Track tooltip size.
  useLayoutEffect(() => {
    const element = tooltipRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setTooltipSize({ width: element.offsetWidth, height: element.offsetHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [activeRun?.step.id]);

  // Bring the target into view when it resolves.
  useEffect(() => {
    if (activeRun?.target) {
      activeRun.target.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    }
  }, [activeRun?.target, reducedMotion]);

  // Initial focus into the tooltip when a step becomes active.
  useEffect(() => {
    if (!activeRun) return;
    const raf = requestAnimationFrame(() => {
      const focusables = getFocusable(tooltipRef.current);
      (focusables[focusables.length - 1] ?? tooltipRef.current)?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [activeRun, activeRun?.step.id, activeRun?.phase]);

  const requestClose = useCallback(() => {
    if (!activeRun) return;
    if (activeRun.stepIndex > 0) setConfirming(true);
    else close();
  }, [activeRun, close]);

  // Global keyboard handling while a tour is active.
  useEffect(() => {
    if (!activeRun) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (confirming) setConfirming(false);
        else requestClose();
        return;
      }
      if (confirming) return;
      if (event.key === 'ArrowRight' && activeRun.canAdvance) {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft' && !activeRun.isFirst) {
        event.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeRun, confirming, next, prev, requestClose]);

  const position: PositionedTooltip = useMemo(
    () =>
      activeRun
        ? computeTooltipPosition(rect, tooltipSize, viewport, activeRun.step.placement ?? 'auto')
        : { top: 0, left: 0, side: 'center', arrow: null },
    [activeRun, rect, tooltipSize, viewport],
  );

  if (typeof document === 'undefined' || !activeRun) return null;

  const showSpotlight = activeRun.phase !== 'target-missing' || rect !== null;

  return createPortal(
    <div aria-live="polite">
      {showSpotlight ? (
        <TutorialSpotlight
          rect={activeRun.step.placement === 'center' ? null : rect}
          reducedMotion={reducedMotion}
          onBackdropClick={requestClose}
        />
      ) : (
        <div
          aria-hidden
          className="fixed inset-0 bg-[var(--overlay)]"
          style={{ zIndex: TUTORIAL_Z }}
          onClick={requestClose}
        />
      )}

      <TutorialTooltip
        ref={tooltipRef}
        run={activeRun}
        position={position}
        reducedMotion={reducedMotion}
        onNext={next}
        onPrev={prev}
        onSkip={skip}
        onClose={requestClose}
        onRetry={retryTarget}
        titleId={titleId}
        descriptionId={descriptionId}
      />

      {confirming ? (
        <ConfirmExit
          onCancel={() => setConfirming(false)}
          onSaveExit={() => {
            setConfirming(false);
            close();
          }}
          onSkip={() => {
            setConfirming(false);
            skip();
          }}
        />
      ) : null}
    </div>,
    document.body,
  );
}

function ConfirmExit({
  onCancel,
  onSaveExit,
  onSkip,
}: Readonly<{ onCancel: () => void; onSaveExit: () => void; onSkip: () => void }>) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    requestAnimationFrame(() => ref.current?.focus());
  }, []);
  return (
    <div
      className="fixed inset-0 grid place-items-center bg-[var(--overlay)] p-4"
      style={{ zIndex: TUTORIAL_Z + 5 }}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-label="Confirmar salida del tutorial"
        tabIndex={-1}
        className="panel w-[min(420px,calc(100vw-2rem))] p-6 outline-none"
      >
        <h2 className="text-lg font-bold tracking-[-0.02em]">¿Salir del tutorial?</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Tu avance se guarda automáticamente. Puedes continuar más tarde desde el Centro de ayuda,
          o marcar el tutorial como omitido.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onSkip}>
            Omitir tutorial
          </Button>
          <Button variant="secondary" onClick={onSaveExit}>
            Guardar y salir
          </Button>
          <Button variant="primary" onClick={onCancel}>
            Continuar aquí
          </Button>
        </div>
      </div>
    </div>
  );
}
