import { describe, expect, it } from 'vitest';
import { badge, challenge, level, prize, sessionReward, week } from '../../testing/fixtures';
import {
  keyOf,
  MAX_CELEBRATIONS,
  orderCelebrations,
  progressionCelebrations,
  rarityOf,
  rewardCelebrations,
  type CelebrationSubject,
} from './celebration-queue';
import { sceneOf } from './celebration-scene';

describe('cola de celebración (pico-final, igual que el móvil)', () => {
  it('insignias común→legendaria, retos fácil→difícil, semana redonda, comodín, premios y rango al final', () => {
    const reward = sessionReward({
      unlockedNow: [badge('LEG', 'LEGENDARIA'), badge('COM', 'COMUN')],
      challengesCompletedNow: [
        challenge('D', 'DIFICIL'),
        challenge('F', 'FACIL'),
        challenge('M', 'MEDIO'),
      ],
      perfectWeekNow: true,
      challenges: week([challenge('F'), challenge('M', 'MEDIO'), challenge('D', 'DIFICIL')]),
      prizesNow: [prize('p1')],
      streak: { current: 14, freezes: 1, freezeEarnedNow: true, milestoneNow: 14 },
      leveledUp: true,
      levelAfter: level(),
    });
    expect(rewardCelebrations(reward).map(keyOf)).toEqual([
      'badge:LEG',
      'challenge:F',
      'challenge:M',
      'challenge:D',
      'perfect:2026-10-12',
      'freeze:14',
      'prize:p1',
      'level:MAQUINA',
    ]);
  });

  it('una cola larga se queda en 8: entran las insignias más raras y nunca se pierden premios ni rango', () => {
    const commons = Array.from({ length: 12 }, (_, i) => badge(`C${i}`, 'COMUN'));
    const reward = sessionReward({
      unlockedNow: [...commons, badge('LEG', 'LEGENDARIA')],
      prizesNow: [prize('p1')],
      leveledUp: true,
      levelAfter: level(),
    });
    const queue = rewardCelebrations(reward).map(keyOf);
    expect(queue).toHaveLength(MAX_CELEBRATIONS);
    expect(queue.slice(-3)).toEqual(['badge:LEG', 'prize:p1', 'level:MAQUINA']);
    expect(queue.slice(0, 5)).toEqual(['badge:C0', 'badge:C1', 'badge:C2', 'badge:C3', 'badge:C4']);
  });

  it('sin nada nuevo, la cola está vacía', () => {
    expect(rewardCelebrations(sessionReward())).toEqual([]);
  });

  it('quita duplicados y conserva el orden dentro de cada grupo', () => {
    const a: CelebrationSubject = { kind: 'prize', prize: prize('a') };
    const b: CelebrationSubject = { kind: 'prize', prize: prize('b') };
    expect(orderCelebrations([b, a, b]).map(keyOf)).toEqual(['prize:b', 'prize:a']);
  });

  it('al abrir la senda celebra solo lo que sigue sin ver', () => {
    const subjects = progressionCelebrations(
      {
        unlockedNow: [],
        badges: [
          badge('VISTA'),
          badge('NUEVA', 'RARA', { isNew: true }),
          badge('FALTA', 'COMUN', { earned: false, isNew: true }),
        ],
        prizes: [prize('viejo', { isNew: false }), prize('nuevo')],
        challenges: week(
          [challenge('F'), challenge('M', 'MEDIO', { isNew: false }), challenge('D', 'DIFICIL')],
          {
            perfectIsNew: true,
          },
        ),
      },
      level(),
    );
    expect(subjects.map(keyOf)).toEqual([
      'badge:NUEVA',
      'challenge:F',
      'challenge:D',
      'perfect:2026-10-12',
      'prize:nuevo',
      'level:MAQUINA',
    ]);
  });

  it('cada sujeto lleva su material: retos por dificultad, premio y rango en oro', () => {
    expect(rarityOf({ kind: 'challenge', challenge: challenge('x', 'MEDIO') })).toBe('RARA');
    expect(rarityOf({ kind: 'perfect', weekStart: 'w', bonus: 150 })).toBe('EPICA');
    expect(rarityOf({ kind: 'freeze', streakDays: 7, freezes: 1 })).toBe('RARA');
    expect(rarityOf({ kind: 'prize', prize: prize('x') })).toBe('LEGENDARIA');
  });
});

describe('escena de cada carta', () => {
  it('el premio trae su código y lo deletrea al lector de pantalla', () => {
    const scene = sceneOf({ kind: 'prize', prize: prize('p'), fresh: true });
    expect(scene.code).toBe('K7M2QX');
    expect(scene.stamp).toBe('¡Es tuyo!');
    expect(scene.heading).toBe('¡Premio desbloqueado!');
    expect(scene.announcement).toContain('K 7 M   2 Q X');
  });

  it('una revisita no lleva sello', () => {
    expect(sceneOf({ kind: 'badge', badge: badge('X'), fresh: false }).stamp).toBeNull();
    expect(sceneOf({ kind: 'prize', prize: prize('p', { isNew: false }) }).stamp).toBeNull();
  });

  it('reto, semana redonda y comodín con sus textos', () => {
    const reto = sceneOf({
      kind: 'challenge',
      challenge: challenge('x', 'DIFICIL', { pointsReward: 160 }),
      fresh: true,
    });
    expect(reto.label).toBe('Reto difícil');
    expect(reto.points).toBe(160);
    expect(sceneOf({ kind: 'perfect', weekStart: 'w', bonus: 150 }).heading).toBe(
      '¡Semana redonda!',
    );
    const freeze = sceneOf({ kind: 'freeze', streakDays: 7, freezes: 2, fresh: true });
    expect(freeze.label).toBe('Guardas 2');
    expect(freeze.points).toBeNull();
  });
});
