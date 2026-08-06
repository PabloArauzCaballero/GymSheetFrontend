import type { UserRole } from '@/shared/api/contracts';

/** Where the tooltip bubble is placed relative to the highlighted target. */
export type StepPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto';

/** Coarse difficulty label shown in the Tutorial Center. */
export type TutorialDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/** Logical grouping used by the Tutorial Center filters. */
export type TutorialCategory =
  | 'INTRODUCTION'
  | 'NAVIGATION'
  | 'PROFILE'
  | 'TRAINING'
  | 'EXERCISES'
  | 'MEMBERSHIP'
  | 'ADMIN';

/**
 * Read-only context handed to step predicates and auto-actions. Deliberately
 * narrow: the engine never lets a tutorial mutate app state directly — it can
 * only read the DOM/route to decide whether the user completed the action.
 */
export type TutorialStepContext = {
  /** Resolved target element for this step, or null when none/not found. */
  readonly target: HTMLElement | null;
  /** Current pathname (from next/navigation). */
  readonly pathname: string;
  /** Role of the current user. */
  readonly role: UserRole;
};

/**
 * Declarative trigger that lets the engine detect that the user performed the
 * expected action so it can auto-advance (or unlock the Next button).
 */
export type TutorialAdvanceTrigger =
  | { type: 'click'; target?: string }
  | { type: 'input'; target?: string }
  | { type: 'route'; route: string };

export type TutorialStep = {
  /** Unique within its tutorial. */
  id: string;
  title: string;
  description: string;
  /**
   * `data-tutorial-id` of the element to highlight. Omit for a centered,
   * target-less step (welcome / summary cards).
   */
  target?: string;
  /** Bubble placement. Defaults to 'auto'. */
  placement?: StepPlacement;
  /** Route that must be active; the engine navigates there before showing. */
  route?: string;
  /** Restrict this step to certain roles (subset of the tutorial roles). */
  roles?: readonly UserRole[];
  /** Short, plain description of the action the user should take. */
  expectedAction?: string;
  /** Declarative auto-advance / action detection. */
  advanceOn?: TutorialAdvanceTrigger;
  /** Require the user to perform the action before Next is enabled. */
  requireAction?: boolean;
  /** Optional custom gate; Next is disabled until it returns true. */
  advanceWhen?: (ctx: TutorialStepContext) => boolean;
  /** Message shown while the advance gate is not satisfied. */
  advanceHint?: string;
  /**
   * Optional non-destructive automatic action executed when the step shows
   * (e.g. open a menu). Must never trigger destructive/irreversible operations.
   */
  autoAction?: (ctx: TutorialStepContext) => void | Promise<void>;
  /** Extra time (ms) to wait for an async target before failing. Default 4000. */
  waitForTargetMs?: number;
  /** Keep the highlighted element interactive (defaults to true). */
  allowInteraction?: boolean;
  /** When the target is missing, skip silently instead of showing the error. */
  optional?: boolean;
};

export type TutorialDefinition = {
  id: string;
  /** Semver-ish string; bumping it can require the user to replay. */
  version: string;
  title: string;
  description: string;
  category: TutorialCategory;
  difficulty: TutorialDifficulty;
  /** Rough duration for the Tutorial Center. */
  estimatedMinutes: number;
  /** Roles that may see/run this tutorial. Omit = all authenticated roles. */
  roles?: readonly UserRole[];
  /** Primary route the tutorial lives on (used as a fallback launch route). */
  route?: string;
  /** Ids of tutorials that should be completed first. */
  prerequisites?: readonly string[];
  /** Surfaced as "obligatorio" in the Center. */
  mandatory?: boolean;
  /** Surfaced as "recomendado" in the Center. */
  recommended?: boolean;
  /** Auto-launched once on first portal visit (intro only). */
  autoStart?: boolean;
  /** Suggested follow-up tutorial id (shown on completion). */
  next?: string;
  steps: readonly TutorialStep[];
};

/** A definition whose steps have been filtered/ordered for a given role. */
export type ResolvedTutorial = TutorialDefinition & {
  steps: readonly TutorialStep[];
};
