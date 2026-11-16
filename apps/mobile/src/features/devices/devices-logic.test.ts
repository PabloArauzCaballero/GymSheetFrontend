/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { UserDevice } from '@gymsheet/schemas';
import { hasOtherDevices, lastSeenLabel, sortDevices } from './devices-logic.ts';

function device(id: string, lastSeenAt: string, current = false): UserDevice {
  return {
    id,
    platform: 'IOS',
    osVersion: '17.4',
    appVersion: '1.0.0',
    deviceModel: 'iPhone 15',
    firstSeenAt: '2026-01-01T00:00:00.000Z',
    lastSeenAt,
    current,
  };
}

test('este dispositivo va primero y el resto por actividad reciente', () => {
  const sorted = sortDevices([
    device('a', '2026-11-01T00:00:00.000Z'),
    device('b', '2026-11-10T00:00:00.000Z'),
    device('c', '2026-10-01T00:00:00.000Z', true),
  ]);
  assert.deepEqual(sorted.map((item) => item.id), ['c', 'b', 'a']);
});

test('la última actividad se lee como frase', () => {
  const now = new Date('2026-11-16T12:00:00.000Z');
  assert.equal(lastSeenLabel({ lastSeenAt: '2026-11-16T10:00:00.000Z' }, now), 'Última actividad: hace 2 h');
  assert.equal(lastSeenLabel({ lastSeenAt: '2026-11-16T11:59:50.000Z' }, now), 'Última actividad: ahora');
});

test('solo ofrece cerrar los demás cuando hay otro dispositivo', () => {
  assert.equal(hasOtherDevices([device('a', '2026-11-01T00:00:00.000Z', true)]), false);
  assert.equal(hasOtherDevices([device('a', '2026-11-01T00:00:00.000Z', true), device('b', '2026-11-01T00:00:00.000Z')]), true);
});
