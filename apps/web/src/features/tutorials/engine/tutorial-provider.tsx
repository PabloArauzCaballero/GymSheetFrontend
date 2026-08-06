'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import type { UserRole } from '@/shared/api/contracts';
import { tutorialRegistry, type TutorialRegistry } from '../registry';
import { tutorialSelector, waitForTarget } from './target-resolver';
import {
  TutorialContext,
  type ActiveRun,
  type RunPhase,
  type TutorialContextValue,
} from './tutorial-context';
import {
  isVersionOutdated,
  overallCompletion,
  pendingPrerequisites,
  prerequisitesMet,
  resumeStepIndex,
  statusOf,
  toProgressMap,
} from './progress-helpers';
import { useProgressStore } from './use-progress-store';

type RunState = { tutorialId: string; stepIndex: number } | null;

function nowIso(): string {
  return new Date().toISOString();
}

export function TutorialProvider({
  role,
  userId,
  registry = tutorialRegistry,
  children,
}: Readonly<{
  role: UserRole;
  userId: string;
  registry?: TutorialRegistry;
  children: ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { records, source, isLoading, save, reset } = useProgressStore(userId);

  const progress = useMemo(() => toProgressMap(records), [records]);
  const tutorials = useMemo(() => registry.forRole(role), [registry, role]);

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

  /** Persists the current step as IN_PROGRESS (fire-and-forget). */
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
    if (toFocus && toFocus.isConnected) {
      // Restore focus after the overlay unmounts.
      requestAnimationFrame(() => toFocus.focus());
    }
  }, []);

  const start = useCallback(
    (tutorialId: string, options?: { restart?: boolean }) => {
      const tutorial = registry.resolveForRole(tutorialId, role);
      if (!tutorial) {
        toast.error('Este tutorial no está disponible para tu perfil.');
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
    const nextId = activeTutorial.next;
    clearRun();
    toast.success('Tutorial completado.', {
      description: nextId
        ? 'Puedes continuar con el tutorial recomendado desde el Centro de ayuda.'
        : undefined,
    });
  }, [activeTutorial, clearRun, progress, run, save]);

  const next = useCallback(() => {
    if (!run || !activeTutorial) return;
    const isLast = run.stepIndex >= activeTutorial.steps.length - 1;
    if (isLast) {
      finish();
      return;
    }
    const stepIndex = run.stepIndex + 1;
    const step = activeTutorial.steps[stepIndex];
    if (!step) {
      finish();
      return;
    }
    setActionSatisfied(false);
    setRun({ tutorialId: run.tutorialId, stepIndex });
    persistStep(
      run.tutorialId,
      activeTutorial.version,
      step.id,
      progress[run.tutorialId]?.startedAt ?? null,
    );
  }, [activeTutorial, finish, persistStep, progress, run]);

  const prev = useCallback(() => {
    if (!run || !activeTutorial || run.stepIndex === 0) return;
    const stepIndex = run.stepIndex - 1;
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
  }, [activeTutorial, persistStep, progress, run]);

  const goTo = useCallback(
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

  // Keep a stable ref to the latest advance() so DOM listeners don't re-subscribe.
  useEffect(() => {
    advanceRef.current = next;
  }, [next]);

  // --- Step resolution: navigate → run auto-action → wait for target --------
  useEffect(() => {
    if (!run || !activeStep) return;
    const step = activeStep;
    let cancelled = false;
    const controller = new AbortController();

    async function resolve() {
      if (step.route && pathname !== step.route) {
        setPhase('navigating');
        router.push(step.route);
        return; // effect re-runs when pathname updates
      }
      setPhase('resolving');
      setTarget(null);

      if (step.autoAction) {
        try {
          await step.autoAction({ target: null, pathname, role });
        } catch {
          // Auto-actions are best-effort; failing one must not abort the tour.
        }
      }
      if (cancelled) return;

      if (!step.target) {
        setPhase('active');
        return;
      }
      const element = await waitForTarget(step.target, {
        timeoutMs: step.waitForTargetMs ?? 4000,
        signal: controller.signal,
      });
      if (cancelled) return;
      if (element) {
        setTarget(element);
        setPhase('active');
      } else if (step.optional) {
        advanceRef.current();
      } else {
        setPhase('target-missing');
      }
    }

    void resolve();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.tutorialId, run?.stepIndex, pathname, role, resolveNonce]);

  // --- Auto-advance on the expected DOM interaction -------------------------
  useEffect(() => {
    if (!run || !activeStep || phase !== 'active') return;
    const trigger = activeStep.advanceOn;
    if (!trigger || trigger.type === 'route') return;
    const element = trigger.target
      ? document.querySelector<HTMLElement>(tutorialSelector(trigger.target))
      : target;
    if (!element) return;
    const eventName = trigger.type === 'click' ? 'click' : 'input';
    const handler = () => {
      setActionSatisfied(true);
      if (!activeStep.requireAction) window.setTimeout(() => advanceRef.current(), 220);
    };
    element.addEventListener(eventName, handler);
    return () => element.removeEventListener(eventName, handler);
  }, [run, activeStep, phase, target]);

  // --- Auto-advance when the expected route becomes active ------------------
  useEffect(() => {
    if (!run || !activeStep || phase !== 'active') return;
    if (activeStep.advanceOn?.type === 'route' && pathname === activeStep.advanceOn.route) {
      advanceRef.current();
    }
  }, [pathname, run, activeStep, phase]);

  // --- Re-evaluate custom gates on user interaction -------------------------
  useEffect(() => {
    if (!run || !activeStep || phase !== 'active') return;
    if (!activeStep.advanceWhen && !activeStep.requireAction) return;
    const bump = () => setGateNonce((value) => value + 1);
    const events: (keyof DocumentEventMap)[] = ['click', 'input', 'change', 'keyup'];
    for (const event of events) document.addEventListener(event, bump, true);
    return () => {
      for (const event of events) document.removeEventListener(event, bump, true);
    };
  }, [run, activeStep, phase]);

  // --- Auto-start the intro tutorial once, on first load --------------------
  useEffect(() => {
    if (autoStartedRef.current || isLoading) return;
    const intro = tutorials.find((tutorial) => tutorial.autoStart);
    if (!intro) return;
    autoStartedRef.current = true;
    // Intentional one-time side effect: launch the intro tour after progress
    // has loaded, exactly once per session (guarded by autoStartedRef).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (statusOf(progress, intro.id) === 'NOT_STARTED') start(intro.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, tutorials]);

  const canAdvance = useMemo(() => {
    if (!activeStep) return true;
    if (activeStep.requireAction && !actionSatisfied) return false;
    if (activeStep.advanceWhen && !activeStep.advanceWhen({ target, pathname, role })) return false;
    return true;
    // gateNonce forces re-evaluation after user interaction
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

  const value: TutorialContextValue = useMemo(
    () => ({
      ready: !isLoading,
      role,
      progressSource: source,
      tutorials,
      overallPercent: overallCompletion(tutorials, progress),
      activeRun,
      start,
      next,
      prev,
      goTo,
      skip,
      close: clearRun,
      reset: resetTutorial,
      retryTarget,
      statusOf: (id) => statusOf(progress, id),
      isOutdated: (id) => {
        const tutorial = registry.get(id);
        return tutorial ? isVersionOutdated(progress[id], tutorial) : false;
      },
      prerequisitesMet: (id) => {
        const tutorial = registry.get(id);
        return tutorial ? prerequisitesMet(tutorial, progress) : true;
      },
      pendingPrerequisites: (id) => {
        const tutorial = registry.get(id);
        return tutorial ? pendingPrerequisites(tutorial, progress) : [];
      },
      repeatCountOf: (id) => progress[id]?.repeatCount ?? 0,
    }),
    [
      activeRun,
      clearRun,
      goTo,
      isLoading,
      next,
      prev,
      progress,
      registry,
      resetTutorial,
      retryTarget,
      role,
      skip,
      source,
      start,
      tutorials,
    ],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}
