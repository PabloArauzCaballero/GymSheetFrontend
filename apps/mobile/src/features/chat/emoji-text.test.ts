/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { dropLastSymbol } from './emoji-text.ts';

test('borra la última letra de un texto normal', () => {
  assert.equal(dropLastSymbol('Hola'), 'Hol');
  assert.equal(dropLastSymbol(''), '');
});

test('un emoji simple se borra entero', () => {
  assert.equal(dropLastSymbol('Vamos 💪'), 'Vamos ');
});

test('un emoji con tono de piel se borra entero', () => {
  assert.equal(dropLastSymbol('ok 👍🏽'), 'ok ');
});

test('un emoji unido con ZWJ se borra entero', () => {
  assert.equal(dropLastSymbol('a❤️‍🔥'), 'a');
  assert.equal(dropLastSymbol('🔥🏋️‍♀️'), '🔥');
});

test('un emoji con selector de variación se borra entero', () => {
  assert.equal(dropLastSymbol('x✌️'), 'x');
});
