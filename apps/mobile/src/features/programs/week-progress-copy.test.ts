/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { describeWeekSessions } from './week-progress-copy.ts';

test('sesiones dentro del plan usan fracción', () => {
  assert.equal(describeWeekSessions(1, 3), '1 / 3 sesiones');
  assert.equal(describeWeekSessions(0, 1), '0 / 1 sesión');
});

test('sesiones por encima del plan no dicen «3 de 1»', () => {
  const text = describeWeekSessions(3, 1);
  assert.doesNotMatch(text, /3 \/ 1|3 de 1/u);
  assert.equal(text, '3 sesiones · 2 extra sobre el plan de 1');
});

test('sin plan no hay «/ 0»', () => {
  assert.equal(describeWeekSessions(0, 0), 'Sin sesiones planeadas');
  assert.equal(describeWeekSessions(2, 0), '2 sesiones');
});
