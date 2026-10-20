/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { ARENA_CODES } from '../../theme/arenas.ts';
import { ARENA_COUNT, arenaArtXml, arenaCodeFor } from './arena-art.ts';
import { arenaToCelebrate, buildRoad, formatPoints, type RoadArenaSource, type RoadLevel } from './road.ts';

const RANK_THRESHOLDS = [0, 500, 1500, 4000, 9000, 18000, 32000, 55000];
const ARENA_THRESHOLDS = [0, 250, 500, 900, 1500, 2500, 4000, 6000, 9000, 13000, 18000, 24000, 32000, 42000, 55000, 75000];

const path: RoadLevel[] = RANK_THRESHOLDS.map((minPoints, index) => ({
  code: `R${index + 1}`,
  name: `Rango ${index + 1}`,
  tagline: '',
  minPoints,
  sortOrder: index + 1,
  color: '#ffffff',
  icon: 'flame-outline',
}));

const arenas: RoadArenaSource[] = ARENA_THRESHOLDS.map((minPoints, index) => ({
  code: ARENA_CODES[index] ?? `A${index}`,
  name: `Arena ${index + 1}`,
  tagline: '',
  minPoints,
  milestones: ['a', 'b', 'c'],
}));

test('coloca a quien ganó 4.691 puntos en la séptima arena, La Jaula', () => {
  const road = buildRoad(arenas, path, 4691);
  assert.equal(road.currentIndex, 6);
  assert.equal(road.arenas[6]?.code, 'JAULA');
  assert.equal(road.arenas[7]?.state, 'next');
  assert.equal(road.arenas[8]?.state, 'locked');
  assert.equal(road.next?.pointsToEnter, 6000 - 4691);
  assert.equal(road.arenas[0]?.segmentProgress, 1);
});

test('marca como subida de rango solo las arenas cuyo umbral es el de un rango', () => {
  const road = buildRoad(arenas, path, 0);
  assert.deepEqual(
    road.arenas.filter((arena) => arena.rankUp).map((arena) => arena.order),
    [1, 3, 5, 7, 9, 11, 13, 15],
  );
  assert.equal(road.arenas[3]?.rank?.code, 'R2');
  assert.equal(road.arenas[3]?.rankUp, false);
});

test('con un servidor sin arenas, cada rango hace de arena', () => {
  const road = buildRoad([], path, 600);
  assert.equal(road.arenas.length, 8);
  assert.equal(road.arenas[1]?.name, 'Rango 2');
  assert.equal(road.currentIndex, 1);
});

test('en la cima el tramo está lleno y no hay siguiente', () => {
  const road = buildRoad(arenas, path, 90000);
  assert.equal(road.currentIndex, 15);
  assert.equal(road.next, null);
  assert.equal(road.arenas[15]?.segmentProgress, 1);
});

test('celebra la arena nueva una sola vez y nunca la primera', () => {
  const road = buildRoad(arenas, path, 4691);
  assert.equal(arenaToCelebrate(road, null)?.order, 7);
  assert.equal(arenaToCelebrate(road, 6)?.order, 7);
  assert.equal(arenaToCelebrate(road, 7), null);
  assert.equal(arenaToCelebrate(buildRoad(arenas, path, 100), null), null);
});

test('formatea los puntos con punto de miles', () => {
  assert.equal(formatPoints(55000), '55.000');
  assert.equal(formatPoints(950), '950');
  assert.equal(formatPoints(1234567), '1.234.567');
});

test('cada arena tiene su escena, completa y sin valores sin resolver', () => {
  assert.equal(ARENA_COUNT, 16);
  for (const code of ARENA_CODES) {
    const xml = arenaArtXml(code);
    assert.ok(xml.startsWith('<svg') && xml.endsWith('</svg>'), code);
    assert.ok(!xml.includes('undefined') && !xml.includes('NaN'), code);
    // Un atributo repetido es XML inválido: SvgXml no pinta la escena.
    for (const tag of xml.match(/<[a-zA-Z][^>]*>/g) ?? []) {
      const names = [...tag.matchAll(/\s([a-zA-Z:-]+)="/g)].map((match) => match[1]);
      assert.equal(new Set(names).size, names.length, `${code}: atributo repetido en ${tag.slice(0, 60)}`);
    }
  }
  assert.equal(arenaCodeFor('DESCONOCIDA', 3), 'MAQUINAS');
  assert.equal(arenaCodeFor('DESCONOCIDA', 99), 'LEYENDAS');
});
