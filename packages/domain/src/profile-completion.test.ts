import { describe, expect, it } from 'vitest';
import { cardDisplayName, pendingProfileItems, pointsChip, profileNudgeTitle } from './profile-completion';

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

  it('shortens the name exactly like the discovery card', () => {
    expect(cardDisplayName('Ana María Pérez Soto')).toBe('Ana M.');
    expect(cardDisplayName('  Lucía  ')).toBe('Lucía');
  });
});
