import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { TutorialProgressRecord } from '@/shared/api/contracts';

vi.mock('./tutorial-progress-service', () => ({
  tutorialProgressService: { list: vi.fn(), upsert: vi.fn(), reset: vi.fn() },
}));

import { tutorialProgressService } from './tutorial-progress-service';
import {
  buildLocalRecord,
  loadProgress,
  resetProgress,
  saveProgress,
} from './tutorial-progress-gateway';
import { clearLocalProgress, readLocalProgress, writeLocalProgress } from './local-progress-store';

const service = vi.mocked(tutorialProgressService);

const record: TutorialProgressRecord = {
  tutorialId: 'a',
  status: 'COMPLETED',
  version: '1.0.0',
  currentStepId: null,
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-02T00:00:00.000Z',
  lastInteractionAt: '2026-01-02T00:00:00.000Z',
  repeatCount: 0,
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => clearLocalProgress());

describe('tutorial-progress-gateway', () => {
  it('loads from backend and mirrors locally', async () => {
    service.list.mockResolvedValue([record]);
    const result = await loadProgress('u1');
    expect(result).toEqual({ records: [record], source: 'remote' });
    expect(readLocalProgress('u1')).toEqual([record]);
  });

  it('falls back to local when the backend endpoint is missing', async () => {
    writeLocalProgress('u1', [record]);
    service.list.mockRejectedValue(new ApiError({ message: 'x', status: 404, kind: 'not-found' }));
    const result = await loadProgress('u1');
    expect(result).toEqual({ records: [record], source: 'local' });
  });

  it('rethrows auth errors instead of hiding them', async () => {
    service.list.mockRejectedValue(
      new ApiError({ message: 'x', status: 401, kind: 'unauthorized' }),
    );
    await expect(loadProgress('u1')).rejects.toBeInstanceOf(ApiError);
  });

  it('saves through the backend when available', async () => {
    service.upsert.mockResolvedValue(record);
    const result = await saveProgress('u1', 'a', { status: 'COMPLETED', version: '1.0.0' });
    expect(result.source).toBe('remote');
    expect(readLocalProgress('u1')).toEqual([record]);
  });

  it('saves locally when the backend is unavailable', async () => {
    service.upsert.mockRejectedValue(new ApiError({ message: 'x', status: 0, kind: 'network' }));
    const result = await saveProgress('u1', 'a', { status: 'IN_PROGRESS', version: '1.0.0' });
    expect(result.source).toBe('local');
    expect(readLocalProgress('u1')[0]?.status).toBe('IN_PROGRESS');
  });

  it('resets locally when the backend is unavailable', async () => {
    writeLocalProgress('u1', [record]);
    service.reset.mockRejectedValue(new ApiError({ message: 'x', status: 0, kind: 'network' }));
    const result = await resetProgress('u1', 'a');
    expect(result).toEqual({ records: [], source: 'local' });
  });

  it('buildLocalRecord preserves startedAt and repeatCount', () => {
    writeLocalProgress('u1', [{ ...record, status: 'IN_PROGRESS', repeatCount: 2 }]);
    const built = buildLocalRecord(
      'u1',
      'a',
      { status: 'COMPLETED', version: '1.0.0' },
      '2026-05-05T00:00:00.000Z',
    );
    expect(built.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(built.repeatCount).toBe(2);
    expect(built.lastInteractionAt).toBe('2026-05-05T00:00:00.000Z');
  });
});
