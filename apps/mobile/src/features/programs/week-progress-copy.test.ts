/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { describeWeekMinutes, describeWeekSessions } from './week-progress-copy.ts';

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

test('minutos dentro de la meta usan fracción; por encima, meta superada', () => {
  assert.equal(describeWeekMinutes(45, 90), '45 / 90 min');
  assert.equal(describeWeekMinutes(96, 30), '96 min · meta de 30 min superada');
  assert.equal(describeWeekMinutes(96.4, 0), '96 min');
});
