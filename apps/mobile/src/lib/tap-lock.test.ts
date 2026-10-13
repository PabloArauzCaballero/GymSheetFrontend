/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { createTapLock } from './tap-lock.ts';

test('un doble toque solo ejecuta una vez y el cerrojo se abre solo', () => {
  let clock = 1000;
  let runs = 0;
  const lock = createTapLock(600, () => clock);
  assert.equal(lock.run(() => (runs += 1)), true);
  clock += 80; // segundo toque del mismo gesto
  assert.equal(lock.run(() => (runs += 1)), false);
  clock += 400;
  assert.equal(lock.run(() => (runs += 1)), false);
  assert.equal(runs, 1);
  clock += 200; // pasada la transición
  assert.equal(lock.run(() => (runs += 1)), true);
  assert.equal(runs, 2);
});

test('release lo abre antes de tiempo (validación fallida: no se navegó)', () => {
  let runs = 0;
  const lock = createTapLock(600, () => 0);
  lock.run(() => (runs += 1));
  lock.release();
  lock.run(() => (runs += 1));
  assert.equal(runs, 2);
});
