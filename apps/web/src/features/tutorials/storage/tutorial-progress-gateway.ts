import { ApiError, type ApiErrorKind } from '@/shared/api/api-error';
import type { TutorialProgressRecord, TutorialProgressUpsert } from '@/shared/api/contracts';
import {
  readLocalProgress,
  removeLocalProgress,
  upsertLocalProgress,
  writeLocalProgress,
} from './local-progress-store';
import { tutorialProgressService } from './tutorial-progress-service';

/**
 * Coordinates the backend (source of truth for authenticated users) with the
 * in-memory mirror (offline cache / fallback). When the backend endpoints are
 * unavailable — not implemented yet, offline, or a transient outage — the
 * gateway degrades to the in-memory mirror so the help feature keeps working,
 * and it always mirrors successful backend reads/writes there.
 */

export type ProgressSource = 'remote' | 'local';

export type LoadResult = {
  records: TutorialProgressRecord[];
  source: ProgressSource;
};

/** Kinds that mean "the backend can't serve this right now" → use local. */
const FALLBACK_KINDS = new Set<ApiErrorKind>([
  'not-found',
  'network',
  'contract',
  'unexpected',
  'rate-limit',
]);

function shouldFallback(error: unknown): boolean {
  return error instanceof ApiError && FALLBACK_KINDS.has(error.kind);
}

export async function loadProgress(userId: string): Promise<LoadResult> {
  try {
    const records = await tutorialProgressService.list();
    writeLocalProgress(userId, records);
    return { records, source: 'remote' };
  } catch (error: unknown) {
    if (shouldFallback(error)) return { records: readLocalProgress(userId), source: 'local' };
    throw error;
  }
}

export async function saveProgress(
  userId: string,
  tutorialId: string,
  input: TutorialProgressUpsert,
): Promise<{ record: TutorialProgressRecord; source: ProgressSource }> {
  try {
    const record = await tutorialProgressService.upsert(tutorialId, input);
    upsertLocalProgress(userId, record);
    return { record, source: 'remote' };
  } catch (error: unknown) {
    if (!shouldFallback(error)) throw error;
    const record = buildLocalRecord(userId, tutorialId, input);
    upsertLocalProgress(userId, record);
    return { record, source: 'local' };
  }
}

export async function resetProgress(
  userId: string,
  tutorialId: string,
): Promise<{ records: TutorialProgressRecord[]; source: ProgressSource }> {
  try {
    const records = await tutorialProgressService.reset(tutorialId);
    writeLocalProgress(userId, records);
    return { records, source: 'remote' };
  } catch (error: unknown) {
    if (!shouldFallback(error)) throw error;
    return { records: removeLocalProgress(userId, tutorialId), source: 'local' };
  }
}

/**
 * Builds the record we persist locally when the backend is unavailable, merging
 * with any existing local record so `startedAt`/`repeatCount` are preserved.
 * `isoNow` is injected so this stays deterministic in tests.
 */
export function buildLocalRecord(
  userId: string,
  tutorialId: string,
  input: TutorialProgressUpsert,
  isoNow: string = new Date().toISOString(),
): TutorialProgressRecord {
  const existing = readLocalProgress(userId).find((item) => item.tutorialId === tutorialId);
  return {
    tutorialId,
    status: input.status,
    version: input.version,
    currentStepId: input.currentStepId ?? existing?.currentStepId ?? null,
    startedAt: input.startedAt ?? existing?.startedAt ?? isoNow,
    completedAt: input.completedAt ?? existing?.completedAt ?? null,
    lastInteractionAt: isoNow,
    repeatCount: input.repeatCount ?? existing?.repeatCount ?? 0,
  };
}
