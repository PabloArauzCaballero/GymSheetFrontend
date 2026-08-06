'use client';

import { createContext, useContext } from 'react';
import type { UserRole } from '@/shared/api/contracts';
import type { ResolvedTutorial, TutorialStep } from '../model/types';
import type { ProgressSource } from '../storage/tutorial-progress-gateway';
import type { TutorialStatus } from './progress-helpers';

/** Lifecycle phase of the step currently being shown. */
export type RunPhase =
  | 'navigating' // routing to the step's page
  | 'resolving' // waiting for the target element to appear
  | 'active' // step is visible
  | 'target-missing'; // target never appeared (recoverable error state)

export type ActiveRun = {
  tutorial: ResolvedTutorial;
  stepIndex: number;
  step: TutorialStep;
  phase: RunPhase;
  target: HTMLElement | null;
  /** Whether the required action (if any) has been performed. */
  actionSatisfied: boolean;
  /** Whether the Next control should be enabled. */
  canAdvance: boolean;
  isFirst: boolean;
  isLast: boolean;
};

export type TutorialContextValue = {
  ready: boolean;
  role: UserRole;
  progressSource: ProgressSource;
  /** Tutorials visible to the current role. */
  tutorials: ResolvedTutorial[];
  /** Overall completion percentage (0–100). */
  overallPercent: number;
  activeRun: ActiveRun | null;

  start: (tutorialId: string, options?: { restart?: boolean }) => void;
  next: () => void;
  prev: () => void;
  goTo: (stepIndex: number) => void;
  /** Abandon the whole tutorial (persists SKIPPED). */
  skip: () => void;
  /** Close the overlay but keep progress so it can be resumed later. */
  close: () => void;
  /** Reset a tutorial's progress back to not-started. */
  reset: (tutorialId: string) => void;
  /** Retry resolving a missing target. */
  retryTarget: () => void;

  statusOf: (tutorialId: string) => TutorialStatus;
  isOutdated: (tutorialId: string) => boolean;
  prerequisitesMet: (tutorialId: string) => boolean;
  pendingPrerequisites: (tutorialId: string) => string[];
  repeatCountOf: (tutorialId: string) => number;
};

export const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial(): TutorialContextValue {
  const value = useContext(TutorialContext);
  if (!value) throw new Error('useTutorial debe usarse dentro de <TutorialProvider>');
  return value;
}
