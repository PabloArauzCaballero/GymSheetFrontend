/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Progression } from '@gymsheet/schemas';
import { fitnessNumbers } from './fitness-numbers.ts';

const stats = { currentStreakDays: 2, totalSessions: 9 } as Progression['stats'];

test('the hero numbers come from the progression, live streak first', () => {
  assert.deepEqual(fitnessNumbers({ points: 70, stats, streak: { current: 4 } as Progression['streak'] }), { points: 70, streak: 4, sessions: 9 });
  assert.deepEqual(fitnessNumbers({ points: 0, stats, streak: undefined }), { points: 0, streak: 2, sessions: 9 });
});
