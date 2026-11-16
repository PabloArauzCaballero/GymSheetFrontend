import { describe, expect, it } from 'vitest';
import { cardDisplayName, completionRingLabel, fitnessEmptyHint, pendingProfileItems, pointsChip, profileNudgeTitle, profileProgress } from './profile-completion';

const item = (code: string, done: boolean, awarded: boolean, points = 20) => ({ code, label: code, hint: '', points, done, awarded });

describe('profile completion copy', () => {
  it('lists only what is missing and still pays', () => {
    const items = [item('FOTO', false, false, 50), item('BIO', true, true), item('FOTOS_3', false, true)];
    expect(pendingProfileItems(items).map((entry) => entry.code)).toEqual(['FOTO']);
  });

  it('treats data a member already had before points existed (grandfathered at 0) as done, not as pending', () => {
    // The server records them as awarded with 0 points: no "+N pts" chip and no promise.
    const items = [item('FOTO', true, true, 0), item('DATOS', true, true, 0), item('BIO', false, false, 40)];
    expect(pendingProfileItems(items).map((entry) => entry.code)).toEqual(['BIO']);
  });

  it('promises points only when there are points left', () => {
    expect(profileNudgeTitle(190)).toBe('Completa tu perfil y gana +190 puntos');
    expect(profileNudgeTitle(0)).toBeNull();
    expect(pointsChip(50)).toBe('+50');
    expect(pointsChip(15000)).toBe('+15.000');
  });

  it('gives one progress number (items, the server percent) for ring, bar and header', () => {
    expect(profileProgress({ completed: 3, total: 8, percent: 37 })).toEqual({ ratio: 0.37, label: 'Perfil al 37 %: 3 de 8 datos' });
    expect(profileProgress({ completed: 8, total: 8, percent: 100 }).ratio).toBe(1);
    expect(profileProgress({ completed: 0, total: 8, percent: -5 }).ratio).toBe(0);
  });

  it('shortens the name exactly like the discovery card', () => {
    expect(cardDisplayName('Ana María Pérez Soto')).toBe('Ana M.');
    expect(cardDisplayName('  Lucía  ')).toBe('Lucía');
  });
});

describe('fitnessEmptyHint', () => {
  it('points to the first session when there are none', () => {
    expect(fitnessEmptyHint({ streak: 0, sessions: 0 })).toBe('Tu primera sesión enciende la racha.');
  });
  it('asks to relight a lapsed streak', () => {
    expect(fitnessEmptyHint({ streak: 0, sessions: 12 })).toBe('Entrena hoy y vuelve a encender tu racha.');
  });
  it('says nothing while the streak is alive', () => {
    expect(fitnessEmptyHint({ streak: 3, sessions: 12 })).toBeNull();
  });
});

describe('completionRingLabel', () => {
  it('speaks of the profile, not a photo, when there is none', () => {
    expect(completionRingLabel({ hasPhoto: false, percent: 25 })).toBe('Tu perfil, 25 % completo');
    expect(completionRingLabel({ hasPhoto: true, percent: 100 })).toBe('Tu foto de perfil, 100 % completo');
  });

  it('says when the progress could not be read, and stays plain while loading', () => {
    expect(completionRingLabel({ hasPhoto: false, percent: null, failed: true })).toBe('Tu perfil. Progreso sin cargar');
    expect(completionRingLabel({ hasPhoto: false, percent: null })).toBe('Tu perfil');
  });
});

describe('award moment and complete state', () => {
  it('sums only what this read awarded', async () => {
    const { awardedNowPoints, awardAnnouncement } = await import('./profile-completion');
    const items = [item('FOTO', true, true, 50), item('BIO', true, true, 40), item('NIVEL', true, true, 20)];
    expect(awardedNowPoints({ items, awardedNow: ['FOTO', 'BIO'] })).toBe(90);
    expect(awardedNowPoints({ items, awardedNow: [] })).toBe(0);
    expect(awardAnnouncement(90)).toBe('+90 puntos por completar tu perfil.');
  });

  it('celebrates 100 % with the points earned, and without a number when none were', async () => {
    const { profileCompleteCopy } = await import('./profile-completion');
    expect(profileCompleteCopy({ percent: 88, pointsEarned: 150 })).toBeNull();
    expect(profileCompleteCopy({ percent: 100, pointsEarned: 190 })).toEqual({ title: 'Perfil completo', body: 'Ganaste 190 puntos completándolo. Así te ven en Conocer.' });
    expect(profileCompleteCopy({ percent: 100, pointsEarned: 0 })?.body).toBe('Así te ven en Conocer.');
  });
});

describe('points award delta', () => {
  it('trusts awardedNow, else the rise of pointsEarned since the last read seen', async () => {
    const { pointsAwardDelta } = await import('./profile-completion');
    const items = [item('BIO', true, true, 40)];
    expect(pointsAwardDelta(null, { pointsEarned: 250, items, awardedNow: ['BIO'] })).toBe(40);
    // Another request (the progression read) awarded it first: this read says nothing, the total rose.
    expect(pointsAwardDelta(210, { pointsEarned: 250, items, awardedNow: [] })).toBe(40);
    expect(pointsAwardDelta(null, { pointsEarned: 250, items, awardedNow: [] })).toBe(0);
    expect(pointsAwardDelta(250, { pointsEarned: 250, items, awardedNow: [] })).toBe(0);
    // The same awarding read seen by a second screen: not a second celebration.
    expect(pointsAwardDelta(250, { pointsEarned: 250, items, awardedNow: ['BIO'] })).toBe(0);
  });
});
