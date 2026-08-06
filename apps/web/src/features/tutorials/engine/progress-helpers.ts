import type { TutorialProgressRecord, TutorialProgressStatus } from '@/shared/api/contracts';
import type { ResolvedTutorial, TutorialDefinition } from '../model/types';

export type TutorialStatus = TutorialProgressStatus | 'NOT_STARTED';

/** Indexes progress records by tutorial id for O(1) lookups. */
export function toProgressMap(
  records: readonly TutorialProgressRecord[],
): Record<string, TutorialProgressRecord> {
  const map: Record<string, TutorialProgressRecord> = {};
  for (const record of records) map[record.tutorialId] = record;
  return map;
}

export function statusOf(
  map: Record<string, TutorialProgressRecord>,
  tutorialId: string,
): TutorialStatus {
  return map[tutorialId]?.status ?? 'NOT_STARTED';
}

/**
 * A completed tutorial whose stored version differs from the current definition
 * version is "outdated" — the content changed since the user last saw it, so the
 * Center can invite them to replay it.
 */
export function isVersionOutdated(
  record: TutorialProgressRecord | undefined,
  tutorial: TutorialDefinition,
): boolean {
  return !!record && record.version !== tutorial.version;
}

/**
 * Where to resume a tutorial. Restarts from the beginning when there is no
 * stored step, the step no longer exists, or the version changed (content may
 * have shifted, so replaying from the top is the safe strategy).
 */
export function resumeStepIndex(
  record: TutorialProgressRecord | undefined,
  tutorial: ResolvedTutorial,
): number {
  if (!record || record.status === 'COMPLETED') return 0;
  if (record.version !== tutorial.version) return 0;
  if (!record.currentStepId) return 0;
  const index = tutorial.steps.findIndex((step) => step.id === record.currentStepId);
  return index >= 0 ? index : 0;
}

/** Whether prerequisites are all completed for the given progress map. */
export function prerequisitesMet(
  tutorial: TutorialDefinition,
  map: Record<string, TutorialProgressRecord>,
): boolean {
  return (tutorial.prerequisites ?? []).every((id) => map[id]?.status === 'COMPLETED');
}

/** Ids of prerequisites still pending. */
export function pendingPrerequisites(
  tutorial: TutorialDefinition,
  map: Record<string, TutorialProgressRecord>,
): string[] {
  return (tutorial.prerequisites ?? []).filter((id) => map[id]?.status !== 'COMPLETED');
}

/** Overall completion percentage (0–100) across the visible tutorials. */
export function overallCompletion(
  tutorials: readonly TutorialDefinition[],
  map: Record<string, TutorialProgressRecord>,
): number {
  if (tutorials.length === 0) return 0;
  const completed = tutorials.filter((t) => map[t.id]?.status === 'COMPLETED').length;
  return Math.round((completed / tutorials.length) * 100);
}
