'use client';

import { useEffect } from 'react';
import type { useRouter } from 'next/navigation';
import type { UserRole } from '@/shared/api/contracts';
import type { TutorialProgressRecord } from '@/shared/api/contracts';
import type { ResolvedTutorial } from '../model/types';
import { statusOf } from './progress-helpers';
import { tutorialSelector, waitForTarget } from './target-resolver';
import type { TutorialRunController } from './use-tutorial-run';

type Externals = {
  pathname: string;
  role: UserRole;
  router: ReturnType<typeof useRouter>;
  tutorials: ResolvedTutorial[];
  progress: Record<string, TutorialProgressRecord>;
  isLoading: boolean;
};

/**
 * The DOM-facing side of the engine: navigate → run auto-action → resolve the
 * target, plus the auto-advance listeners, custom-gate re-evaluation and the
 * one-time intro auto-start. Kept separate from the state machine for clarity.
 */
export function useTutorialRunEffects(
  run: TutorialRunController,
  { pathname, role, router, tutorials, progress, isLoading }: Externals,
) {
  const {
    run: runState,
    activeStep,
    phase,
    target,
    resolveNonce,
    setPhase,
    setTarget,
    setActionSatisfied,
    setGateNonce,
    autoStartedRef,
    advanceRef,
    next,
    start,
  } = run;

  // Keep a stable ref to the latest advance() so listeners don't re-subscribe.
  useEffect(() => {
    advanceRef.current = next;
  }, [advanceRef, next]);

  // Step resolution: navigate → auto-action → wait for target.
  useEffect(() => {
    if (!runState || !activeStep) return;
    const step = activeStep;
    let cancelled = false;
    const controller = new AbortController();

    async function resolve() {
      if (step.route && pathname !== step.route) {
        setPhase('navigating');
        router.push(step.route);
        return;
      }
      setPhase('resolving');
      setTarget(null);

      if (step.autoAction) {
        try {
          await step.autoAction({ target: null, pathname, role });
        } catch {
          // Auto-actions are best-effort; a failure must not abort the tour.
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
  }, [runState?.tutorialId, runState?.stepIndex, pathname, role, resolveNonce]);

  // Auto-advance on the expected DOM interaction.
  useEffect(() => {
    if (!runState || !activeStep || phase !== 'active') return;
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
  }, [runState, activeStep, phase, target, advanceRef, setActionSatisfied]);

  // Auto-advance when the expected route becomes active.
  useEffect(() => {
    if (!runState || !activeStep || phase !== 'active') return;
    if (activeStep.advanceOn?.type === 'route' && pathname === activeStep.advanceOn.route) {
      advanceRef.current();
    }
  }, [pathname, runState, activeStep, phase, advanceRef]);

  // Re-evaluate custom gates on user interaction.
  useEffect(() => {
    if (!runState || !activeStep || phase !== 'active') return;
    if (!activeStep.advanceWhen && !activeStep.requireAction) return;
    const bump = () => setGateNonce((value) => value + 1);
    const events: (keyof DocumentEventMap)[] = ['click', 'input', 'change', 'keyup'];
    for (const event of events) document.addEventListener(event, bump, true);
    return () => {
      for (const event of events) document.removeEventListener(event, bump, true);
    };
  }, [runState, activeStep, phase, setGateNonce]);

  // Auto-start the intro tutorial once, after progress has loaded.
  useEffect(() => {
    if (autoStartedRef.current || isLoading) return;
    const intro = tutorials.find((tutorial) => tutorial.autoStart);
    if (!intro) return;
    autoStartedRef.current = true;
    // Intentional one-time side effect, guarded by autoStartedRef.
    if (statusOf(progress, intro.id) === 'NOT_STARTED') start(intro.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, tutorials]);
}
