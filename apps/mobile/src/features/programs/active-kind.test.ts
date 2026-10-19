/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultKind } from './active-kind.ts';

const none = { gym: false, cardio: false };

test('abre en la que está activada', () => {
  assert.equal(defaultKind(undefined, { gym: true, cardio: false }, none), 'gym');
  assert.equal(defaultKind(undefined, { gym: false, cardio: true }, none), 'cardio');
});

test('el enlace manda sobre lo activado', () => {
  assert.equal(defaultKind('cardio', { gym: true, cardio: false }, none), 'cardio');
  assert.equal(defaultKind('otra', { gym: false, cardio: true }, none), 'cardio');
});

test('con las dos activas abre cardio solo si hoy toca cardio y no pesas', () => {
  const both = { gym: true, cardio: true };
  assert.equal(defaultKind(undefined, both, { gym: false, cardio: true }), 'cardio');
  assert.equal(defaultKind(undefined, both, { gym: true, cardio: true }), 'gym');
  assert.equal(defaultKind(undefined, both, none), 'gym');
});

test('sin nada activado abre gym', () => {
  assert.equal(defaultKind(undefined, none, none), 'gym');
});
