import { afterEach, describe, expect, it } from 'vitest';
import type { TutorialProgressRecord } from '@/shared/api/contracts';
import {
  clearLocalProgress,
  readLocalProgress,
  removeLocalProgress,
  upsertLocalProgress,
  writeLocalProgress,
} from './local-progress-store';

const record: TutorialProgressRecord = {
  tutorialId: 'a',
  status: 'IN_PROGRESS',
  version: '1.0.0',
  currentStepId: 's1',
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: null,
  lastInteractionAt: '2026-01-01T00:00:00.000Z',
  repeatCount: 0,
};

afterEach(() => clearLocalProgress());

describe('local-progress-store (in-memory)', () => {
  it('round-trips records per user', () => {
    writeLocalProgress('user-1', [record]);
    expect(readLocalProgress('user-1')).toEqual([record]);
    expect(readLocalProgress('user-2')).toEqual([]);
  });

  it('isolates copies so callers cannot mutate the cache in place', () => {
    writeLocalProgress('user-1', [record]);
    const read = readLocalProgress('user-1');
    read[0]!.status = 'COMPLETED';
    expect(readLocalProgress('user-1')[0]?.status).toBe('IN_PROGRESS');
  });

  it('upserts by tutorialId', () => {
    upsertLocalProgress('user-1', record);
    upsertLocalProgress('user-1', { ...record, status: 'COMPLETED' });
    const all = readLocalProgress('user-1');
    expect(all).toHaveLength(1);
    expect(all[0]?.status).toBe('COMPLETED');
  });

  it('removes a record', () => {
    upsertLocalProgress('user-1', record);
    expect(removeLocalProgress('user-1', 'a')).toEqual([]);
  });
});
