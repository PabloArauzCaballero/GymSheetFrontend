/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { weightTrend } from './weight-trend.ts';

test('a change that rounds to zero says «Sin cambios», never «−0 kg»', () => {
  assert.equal(weightTrend(0, 'KG', '3 oct.'), 'Sin cambios desde 3 oct.');
  assert.equal(weightTrend(-0.04, 'KG', '3 oct.'), 'Sin cambios desde 3 oct.');
  assert.equal(weightTrend(0.04, 'KG', '3 oct.'), 'Sin cambios desde 3 oct.');
});

test('gains and losses carry their sign and one decimal', () => {
  assert.equal(weightTrend(1.5, 'KG', '3 oct.'), '+1,5 kg desde 3 oct.');
  assert.equal(weightTrend(-2.26, 'KG', '3 oct.'), '−2,3 kg desde 3 oct.');
});
