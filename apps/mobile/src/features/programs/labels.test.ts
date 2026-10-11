/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { dayLabel, formatDateOnly } from './labels.ts';

test('formatea una fecha de calendario sin moverla de día', () => {
  assert.equal(formatDateOnly('2026-12-05'), '5 dic');
  assert.equal(formatDateOnly('2026-01-01'), '1 ene');
  assert.equal(formatDateOnly('no-fecha'), 'no-fecha');
});

test('no repite «Hoy: Hoy» ni deja «Hoy: »', () => {
  assert.equal(dayLabel('Hoy', 'Hoy'), 'Hoy');
  assert.equal(dayLabel('Hoy', ' hoy '), 'Hoy');
  assert.equal(dayLabel('Hoy', null), 'Hoy');
  assert.equal(dayLabel('Hoy', ''), 'Hoy');
  assert.equal(dayLabel('Hoy', 'Pierna'), 'Hoy: Pierna');
  assert.equal(dayLabel('Lunes', 'Empuje'), 'Lunes: Empuje');
});
