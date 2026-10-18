/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Challenge, Prize, ProgressionBadge, ProgressionLevel, SessionReward } from '@gymsheet/schemas';
import { keyOf, orderCelebrations, progressionCelebrations, rarityOf, rewardCelebrations, subjectTitle, type CelebrationSubject } from './queue.ts';

const badge = (code: string, rarity: ProgressionBadge['rarity'], extra: Partial<ProgressionBadge> = {}): ProgressionBadge => ({
  code,
  name: code,
  description: '',
  flavorText: null,
  category: 'HITO',
  rarity,
  icon: 'medal',
  color: '#000000',
  pointsReward: 10,
  earned: true,
  earnedAt: null,
  isNew: false,
  progress: null,
  progressLabel: null,
  ...extra,
});

const challenge = (code: string, difficulty: Challenge['difficulty'], extra: Partial<Challenge> = {}): Challenge => ({
  code,
  kind: 'SESSIONS',
  difficulty,
  title: code,
  description: '',
  icon: 'flag',
  target: 3,
  current: 3,
  progress: 1,
  progressLabel: '3 / 3',
  pointsReward: 60,
  completed: true,
  completedAt: null,
  isNew: true,
  ...extra,
});

const prize = (id: string, extra: Partial<Prize> = {}): Prize => ({
  id,
  title: `Premio ${id}`,
  description: null,
  instructions: null,
  icon: 'gift-outline',
  source: { kind: 'BADGE', code: 'RACHA_30', name: 'Racha de 30' },
  code: 'K7M2QX',
  status: 'DISPONIBLE',
  awardedAt: '2026-10-18T10:00:00Z',
  expiresAt: null,
  redeemedAt: null,
  isNew: true,
  ...extra,
});

const level = { code: 'MAQUINA', name: 'Máquina' } as ProgressionLevel;

const week = (items: Challenge[], perfect = false) => ({
  weekStart: '2026-10-12',
  endsAt: '2026-10-19T04:00:00Z',
  items,
  completedCount: items.filter((item) => item.completed).length,
  perfect,
  perfectBonus: 150,
  perfectIsNew: perfect,
});

test('pico-final: insignias por rareza, retos por dificultad, semana redonda, comodín, premios y rango al final', () => {
  const shuffled: CelebrationSubject[] = [
    { kind: 'level', level, fresh: true },
    { kind: 'prize', prize: prize('p1') },
    { kind: 'freeze', streakDays: 7, freezes: 1 },
    { kind: 'challenge', challenge: challenge('HARD', 'DIFICIL') },
    { kind: 'badge', badge: badge('LEG', 'LEGENDARIA') },
    { kind: 'perfect', weekStart: '2026-10-12', bonus: 150 },
    { kind: 'challenge', challenge: challenge('EASY', 'FACIL') },
    { kind: 'badge', badge: badge('COM', 'COMUN') },
    { kind: 'badge', badge: badge('RAR', 'RARA') },
  ];
  assert.deepEqual(orderCelebrations(shuffled).map(keyOf), [
    'badge:COM',
    'badge:RAR',
    'badge:LEG',
    'challenge:EASY',
    'challenge:HARD',
    'perfect:2026-10-12',
    'freeze:7',
    'prize:p1',
    'level:MAQUINA',
  ]);
});

test('la cola no repite una carta', () => {
  const twice: CelebrationSubject[] = [
    { kind: 'badge', badge: badge('A', 'COMUN') },
    { kind: 'badge', badge: badge('A', 'COMUN') },
  ];
  assert.equal(orderCelebrations(twice).length, 1);
});

test('material y título de cada sujeto', () => {
  assert.equal(rarityOf({ kind: 'challenge', challenge: challenge('x', 'MEDIO') }), 'RARA');
  assert.equal(rarityOf({ kind: 'perfect', weekStart: 'w', bonus: 150 }), 'EPICA');
  assert.equal(rarityOf({ kind: 'freeze', streakDays: 7, freezes: 1 }), 'RARA');
  assert.equal(rarityOf({ kind: 'prize', prize: prize('p') }), 'LEGENDARIA');
  assert.equal(subjectTitle({ kind: 'level', level }), 'Rango Máquina');
  assert.equal(subjectTitle({ kind: 'freeze', streakDays: 7, freezes: 1 }), 'Comodín');
});

test('la recompensa de sesión abre todo lo nuevo en orden', () => {
  const reward = {
    unlockedNow: [badge('B', 'EPICA')],
    challengesCompletedNow: [challenge('C', 'MEDIO')],
    perfectWeekNow: true,
    challenges: week([challenge('C', 'MEDIO')], true),
    streak: { current: 14, freezes: 2, freezeEarnedNow: true, milestoneNow: 14 },
    prizesNow: [prize('p2')],
    leveledUp: true,
    levelAfter: level,
  } as unknown as SessionReward;
  assert.deepEqual(rewardCelebrations(reward).map(keyOf), [
    'badge:B',
    'challenge:C',
    'perfect:2026-10-12',
    'freeze:14',
    'prize:p2',
    'level:MAQUINA',
  ]);
});

test('una recompensa de un servidor anterior solo trae insignias y rango', () => {
  const reward = {
    unlockedNow: [badge('B', 'COMUN')],
    challengesCompletedNow: [],
    perfectWeekNow: false,
    prizesNow: [],
    leveledUp: false,
    levelAfter: null,
  } as unknown as SessionReward;
  assert.deepEqual(rewardCelebrations(reward).map(keyOf), ['badge:B']);
});

test('la senda celebra lo que sigue sin ver', () => {
  const subjects = progressionCelebrations(
    {
      unlockedNow: [badge('NOW', 'RARA')],
      badges: [badge('NOW', 'RARA', { isNew: true }), badge('OLD', 'COMUN', { isNew: true }), badge('SEEN', 'COMUN')],
      prizes: [prize('nuevo'), prize('visto', { isNew: false })],
      challenges: week([challenge('A', 'FACIL'), challenge('B', 'MEDIO', { isNew: false }), challenge('C', 'DIFICIL', { completed: false, isNew: false })]),
    },
    level,
  );
  assert.deepEqual(subjects.map(keyOf), ['badge:OLD', 'badge:NOW', 'challenge:A', 'prize:nuevo', 'level:MAQUINA']);
});
