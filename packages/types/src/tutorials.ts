import type { TutorialProgressStatus } from './enums';

/**
 * Per-user progress for a single tutorial. This is the persistence contract
 * shared by web and mobile so both clients read/write the same shape. The
 * backend is the source of truth when the user is authenticated; clients may
 * mirror this locally as an offline cache (never as the only source of truth).
 *
 * Absence of a record means the tutorial has not been started.
 */
export type TutorialProgressRecord = {
  tutorialId: string;
  /** Status of the tutorial for this user. */
  status: TutorialProgressStatus;
  /** Version of the definition the progress refers to (semver-ish string). */
  version: string;
  /** Id of the step the user is currently on (null when finished/skipped). */
  currentStepId: string | null;
  /** ISO timestamp of the first time the tutorial was started. */
  startedAt: string | null;
  /** ISO timestamp when the tutorial was completed (null otherwise). */
  completedAt: string | null;
  /** ISO timestamp of the last interaction with the tutorial. */
  lastInteractionAt: string;
  /** How many times the tutorial has been completed/replayed. */
  repeatCount: number;
};

/**
 * Idempotent upsert payload for a tutorial's progress. The server derives
 * `tutorialId` from the route param and `lastInteractionAt` from server time.
 */
export type TutorialProgressUpsert = {
  status: TutorialProgressStatus;
  version: string;
  currentStepId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  repeatCount?: number;
};
