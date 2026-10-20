/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { ARENA_COUNT, arenaArtXml } from './arena-art.ts';
import { arenaToCelebrate, buildRoad, formatPoints, type RoadLevel } from './road.ts';

const THRESHOLDS = [0, 500, 1500, 4000, 9000, 18000, 32000, 55000];

const path: RoadLevel[] = THRESHOLDS.map((minPoints, index) => ({
  code: `L${index + 1}`,
  name: `Rango ${index + 1}`,
  tagline: '',
  arena: index === 2 ? null : `Arena ${index + 1}`,
  milestones: ['a', 'b', 'c'],
  minPoints,
  sortOrder: index + 1,
  color: '#ffffff',
  icon: 'flame-outline',
  unlocked: false,
  current: false,
}));

test('coloca a quien tiene 5.000 puntos en la cuarta arena, con la quinta como siguiente', () => {
  const road = buildRoad(path, 5000);
  assert.equal(road.currentIndex, 3);
  assert.deepEqual(
    road.arenas.map((arena) => arena.state),
    ['done', 'done', 'done', 'current', 'next', 'locked', 'locked', 'locked'],
  );
  assert.equal(road.next?.pointsToEnter, 4000);
  assert.equal(road.arenas[3]?.segmentProgress, 0.2);
  assert.equal(road.arenas[0]?.segmentProgress, 1);
  assert.equal(road.arenas[5]?.segmentProgress, 0);
});

test('usa el nombre del rango cuando el gimnasio no le puso arena', () => {
  const road = buildRoad(path, 0);
  assert.equal(road.arenas[2]?.arenaName, 'Rango 3');
  assert.equal(road.arenas[1]?.arenaName, 'Arena 2');
});

test('ordena por sortOrder aunque el servidor mande el camino desordenado', () => {
  const road = buildRoad([...path].reverse(), 600);
  assert.equal(road.arenas[0]?.level.code, 'L1');
  assert.equal(road.currentIndex, 1);
});

test('en la cima el tramo está lleno y no hay siguiente', () => {
  const road = buildRoad(path, 90000);
  assert.equal(road.currentIndex, 7);
  assert.equal(road.next, null);
  assert.equal(road.arenas[7]?.segmentProgress, 1);
});

test('celebra la arena nueva una sola vez y nunca la primera', () => {
  const road = buildRoad(path, 5000);
  assert.equal(arenaToCelebrate(road, null)?.order, 4);
  assert.equal(arenaToCelebrate(road, 3)?.order, 4);
  assert.equal(arenaToCelebrate(road, 4), null);
  assert.equal(arenaToCelebrate(buildRoad(path, 100), null), null);
});

test('formatea los puntos con punto de miles', () => {
  assert.equal(formatPoints(55000), '55.000');
  assert.equal(formatPoints(950), '950');
  assert.equal(formatPoints(1234567), '1.234.567');
});

test('cada arena tiene un SVG completo y sin valores sin resolver', () => {
  assert.equal(ARENA_COUNT, 8);
  for (let order = 1; order <= ARENA_COUNT + 1; order += 1) {
    const xml = arenaArtXml(order);
    assert.ok(xml.startsWith('<svg') && xml.endsWith('</svg>'), String(order));
    assert.ok(!xml.includes('undefined') && !xml.includes('NaN'), `arena ${order}`);
  }
});
