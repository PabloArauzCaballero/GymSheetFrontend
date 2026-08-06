import { describe, expect, it } from 'vitest';
import type { TutorialProgressRecord } from '@/shared/api/contracts';
import type { ResolvedTutorial, TutorialDefinition } from '../model/types';
import {
  isVersionOutdated,
  overallCompletion,
  pendingPrerequisites,
  prerequisitesMet,
  resumeStepIndex,
  statusOf,
  toProgressMap,
} from './progress-helpers';

const tutorial: ResolvedTutorial = {
  id: 't',
  version: '2.0.0',
  title: 't',
  description: 'd',
  category: 'TRAINING',
  difficulty: 'BEGINNER',
  estimatedMinutes: 1,
  steps: [
    { id: 's1', title: 'a', description: 'a' },
    { id: 's2', title: 'b', description: 'b' },
    { id: 's3', title: 'c', description: 'c' },
  ],
};

function record(overrides: Partial<TutorialProgressRecord>): TutorialProgressRecord {
  return {
    tutorialId: 't',
    status: 'IN_PROGRESS',
    version: '2.0.0',
    currentStepId: 's2',
    startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    lastInteractionAt: '2026-01-01T00:00:00.000Z',
    repeatCount: 0,
    ...overrides,
  };
}

describe('progress-helpers', () => {
  it('indexes and reads status', () => {
    const map = toProgressMap([record({})]);
    expect(statusOf(map, 't')).toBe('IN_PROGRESS');
    expect(statusOf(map, 'missing')).toBe('NOT_STARTED');
  });

  it('resumes at the stored step', () => {
    expect(resumeStepIndex(record({ currentStepId: 's2' }), tutorial)).toBe(1);
  });

  it('restarts when the version changed', () => {
    expect(resumeStepIndex(record({ currentStepId: 's3', version: '1.0.0' }), tutorial)).toBe(0);
  });

  it('restarts a completed tutorial from the top', () => {
    expect(resumeStepIndex(record({ status: 'COMPLETED', currentStepId: null }), tutorial)).toBe(0);
  });

  it('restarts when the stored step no longer exists', () => {
    expect(resumeStepIndex(record({ currentStepId: 'gone' }), tutorial)).toBe(0);
  });

  it('detects an outdated completed record', () => {
    expect(isVersionOutdated(record({ version: '1.0.0' }), tutorial)).toBe(true);
    expect(isVersionOutdated(record({ version: '2.0.0' }), tutorial)).toBe(false);
  });

  it('computes overall completion percentage', () => {
    const defs: TutorialDefinition[] = [tutorial, { ...tutorial, id: 'u' }];
    const map = toProgressMap([record({ tutorialId: 't', status: 'COMPLETED' })]);
    expect(overallCompletion(defs, map)).toBe(50);
  });

  it('evaluates prerequisites', () => {
    const def: TutorialDefinition = { ...tutorial, id: 'x', prerequisites: ['t'] };
    const met = toProgressMap([record({ tutorialId: 't', status: 'COMPLETED' })]);
    const notMet = toProgressMap([record({ tutorialId: 't', status: 'IN_PROGRESS' })]);
    expect(prerequisitesMet(def, met)).toBe(true);
    expect(prerequisitesMet(def, notMet)).toBe(false);
    expect(pendingPrerequisites(def, notMet)).toEqual(['t']);
  });
});
