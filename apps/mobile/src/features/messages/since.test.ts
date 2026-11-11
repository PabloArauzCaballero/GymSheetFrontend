/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { connectedSince, sinceLabel } from './since.ts';

const now = new Date('2026-11-11T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

test('las antigüedades cortas llevan «hace»', () => {
  assert.equal(sinceLabel(ago(10_000), now), 'Ahora');
  assert.equal(sinceLabel(ago(2 * 3600e3), now), 'Hace 2 h');
  assert.equal(connectedSince(ago(4 * 86400e3), now), 'Conectados hace 4 d');
  assert.equal(connectedSince(ago(10_000), now), 'Conectados ahora');
});

test('pasado un año es una fecha, nunca «hace 12 oct 2025»', () => {
  const old = ago(400 * 86400e3);
  assert.match(sinceLabel(old, now), /^El \d{1,2} \S+ \d{4}$/);
  assert.match(connectedSince(old, now), /^Desde \S+ (de )?\d{4}$/);
  assert.doesNotMatch(connectedSince(old, now), /hace/);
});
