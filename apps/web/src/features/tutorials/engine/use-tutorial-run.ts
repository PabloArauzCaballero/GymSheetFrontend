'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { notify } from '@/shared/notifications';
import type { UserRole } from '@/shared/api/contracts';
import type { TutorialProgressRecord, TutorialProgressUpsert } from '@/shared/api/contracts';
import type { TutorialRegistry } from '../registry';
import type { ActiveRun, RunPhase } from './tutorial-context';
import { resumeStepIndex } from './progress-helpers';

type RunState = { tutorialId: string; stepIndex: number } | null;

function nowIso(): string {
  return new Date().toISOString();
}

type Params = {
  registry: TutorialRegistry;
  role: UserRole;
  pathname: string;
  progress: Record<string, TutorialProgressRecord>;
  save: (tutorialId: string, input: TutorialProgressUpsert) => Promise<TutorialProgressRecord>;
  reset: (tutorialId: string) => Promise<void>;
};

/**
 * Owns the run state machine and its control handlers (start/next/prev/goTo/
 * skip/finish/reset). The DOM-facing effects live in `useTutorialRunEffects`;
 * the provider composes both. Split out to keep each unit focused and small.
 */
export function useTutorialRun({ registry, role, pathname, progress, save, reset }: Params) {
  const [run, setRun] = useState<RunState>(null);
  const [phase, setPhase] = useState<RunPhase>('navigating');
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [actionSatisfied, setActionSatisfied] = useState(false);
  const [gateNonce, setGateNonce] = useState(0);
  const [resolveNonce, setResolveNonce] = useState(0);

  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const autoStartedRef = useRef(false);
  // Latest advance() without re-subscribing DOM listeners on every render.
  const advanceRef = useRef<() => void>(() => {});

  const activeTutorial = useMemo(
    () => (run ? registry.resolveForRole(run.tutorialId, role) : null),
    [registry, role, run],
  );
  const activeStep = activeTutorial ? activeTutorial.steps[run?.stepIndex ?? 0] : null;

  const persistStep = useCallback(
    (tutorialId: string, version: string, stepId: string, startedAt: string | null) => {
      void save(tutorialId, {
        status: 'IN_PROGRESS',
        version,
        currentStepId: stepId,
        startedAt: startedAt ?? nowIso(),
      });
    },
    [save],
  );

  const clearRun = useCallback(() => {
    setRun(null);
    setTarget(null);
    setPhase('navigating');
    setActionSatisfied(false);
    const toFocus = lastFocusedRef.current;
    lastFocusedRef.current = null;
    if (toFocus && toFocus.isConnected) requestAnimationFrame(() => toFocus.focus());
  }, []);

  const start = useCallback(
    (tutorialId: string, options?: { restart?: boolean }) => {
      const tutorial = registry.resolveForRole(tutorialId, role);
      if (!tutorial) {
        notify.error('Este tutorial no está disponible para tu perfil.');
        return;
      }
      const record = progress[tutorialId];
      const stepIndex = options?.restart ? 0 : resumeStepIndex(record, tutorial);
      const step = tutorial.steps[stepIndex];
      if (!step) return;
      lastFocusedRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setActionSatisfied(false);
      setTarget(null);
      setPhase('navigating');
      setRun({ tutorialId, stepIndex });
      persistStep(tutorialId, tutorial.version, step.id, record?.startedAt ?? null);
    },
    [persistStep, progress, registry, role],
  );

  const finish = useCallback(() => {
    if (!run || !activeTutorial) return;
    const record = progress[run.tutorialId];
    const alreadyCompleted = record?.status === 'COMPLETED';
    void save(run.tutorialId, {
      status: 'COMPLETED',
      version: activeTutorial.version,
      currentStepId: null,
      completedAt: nowIso(),
      startedAt: record?.startedAt ?? nowIso(),
      repeatCount: (record?.repeatCount ?? 0) + (alreadyCompleted ? 1 : 0),
    });
    clearRun();
    notify.success({
      message: 'Tutorial completado.',
      description: activeTutorial.next
        ? 'Puedes continuar con el tutorial recomendado desde el Centro de ayuda.'
        : undefined,
    });
  }, [activeTutorial, clearRun, progress, run, save]);

  const goToIndex = useCallback(
    (stepIndex: number) => {
      if (!run || !activeTutorial) return;
      const step = activeTutorial.steps[stepIndex];
      if (!step) return;
      setActionSatisfied(false);
      setRun({ tutorialId: run.tutorialId, stepIndex });
      persistStep(
        run.tutorialId,
        activeTutorial.version,
        step.id,
        progress[run.tutorialId]?.startedAt ?? null,
      );
    },
    [activeTutorial, persistStep, progress, run],
  );

  const next = useCallback(() => {
    if (!run || !activeTutorial) return;
    if (run.stepIndex >= activeTutorial.steps.length - 1) finish();
    else goToIndex(run.stepIndex + 1);
  }, [activeTutorial, finish, goToIndex, run]);

  const prev = useCallback(() => {
    if (!run || run.stepIndex === 0) return;
    goToIndex(run.stepIndex - 1);
  }, [goToIndex, run]);

  const skip = useCallback(() => {
    if (!run || !activeTutorial) return;
    void save(run.tutorialId, {
      status: 'SKIPPED',
      version: activeTutorial.version,
      currentStepId: activeTutorial.steps[run.stepIndex]?.id ?? null,
      startedAt: progress[run.tutorialId]?.startedAt ?? nowIso(),
    });
    clearRun();
  }, [activeTutorial, clearRun, progress, run, save]);

  const resetTutorial = useCallback(
    (tutorialId: string) => {
      if (run?.tutorialId === tutorialId) clearRun();
      void reset(tutorialId);
    },
    [clearRun, reset, run],
  );

  const retryTarget = useCallback(() => setResolveNonce((value) => value + 1), []);

  const canAdvance = useMemo(() => {
    if (!activeStep) return true;
    if (activeStep.requireAction && !actionSatisfied) return false;
    if (activeStep.advanceWhen && !activeStep.advanceWhen({ target, pathname, role })) return false;
    return true;
    // gateNonce forces re-evaluation after each user interaction
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, actionSatisfied, target, pathname, role, gateNonce]);

  const activeRun: ActiveRun | null = useMemo(() => {
    if (!run || !activeTutorial || !activeStep) return null;
    return {
      tutorial: activeTutorial,
      stepIndex: run.stepIndex,
      step: activeStep,
      phase,
      target,
      actionSatisfied,
      canAdvance,
      isFirst: run.stepIndex === 0,
      isLast: run.stepIndex >= activeTutorial.steps.length - 1,
    };
  }, [activeStep, activeTutorial, actionSatisfied, canAdvance, phase, run, target]);

  return {
    run,
    phase,
    target,
    resolveNonce,
    activeTutorial,
    activeStep,
    activeRun,
    setPhase,
    setTarget,
    setActionSatisfied,
    setGateNonce,
    lastFocusedRef,
    autoStartedRef,
    advanceRef,
    start,
    next,
    prev,
    goTo: goToIndex,
    skip,
    close: clearRun,
    reset: resetTutorial,
    retryTarget,
  };
}

export type TutorialRunController = ReturnType<typeof useTutorialRun>;
