import { describe, expect, it } from 'vitest';
import type { MyGym } from '@gymsheet/schemas';
import { gymGateCopy, gymMembershipGate, myGymCardOf } from './my-gym';

const SEDE = '0190e2cb-a6d4-7ec3-8f91-a6c735631502';
const AFF = '0190e2cb-a6d4-7ec3-8f91-a6c735631503';
const gym = { id: '0190e2cb-a6d4-7ec3-8f91-a6c735631501', name: 'Top Fitness', handle: 'topfitness', logoUrl: null };

describe('«Mi gimnasio»', () => {
  const none: MyGym = { status: 'NONE', gym: null, location: null, since: null, affiliationId: null, pendingRequest: null, membershipVisible: true };
  it('explains NONE with a way to find the gym', () => {
    const card = myGymCardOf(none);
    expect(card.state).toBe('NONE');
  });
  it('shows «Solicitud enviada a X» while the gym decides', () => {
    const card = myGymCardOf({
      ...none,
      status: 'REQUESTED',
      pendingRequest: { affiliationId: AFF, gym, location: { id: SEDE, name: 'Centro' }, requestedAt: '2026-11-17T10:00:00.000Z', switchesGym: false },
    });
    expect(card.state === 'REQUESTED' && card.title).toBe('Solicitud enviada a Top Fitness');
  });
  it('shows the gym, the sede and a pending switch once confirmed', () => {
    const card = myGymCardOf({
      ...none,
      status: 'CONFIRMED',
      gym,
      location: { id: SEDE, name: 'Centro' },
      since: '2026-11-17T10:00:00.000Z',
      affiliationId: AFF,
      pendingRequest: { affiliationId: SEDE, gym: { ...gym, id: SEDE, name: 'Otro Gym' }, location: null, requestedAt: '2026-11-17T10:00:00.000Z', switchesGym: true },
    });
    expect(card.state).toBe('CONFIRMED');
    if (card.state !== 'CONFIRMED') return;
    expect(card.title).toBe('Socio de Top Fitness');
    expect(card.detail.startsWith('Centro · desde ')).toBe(true);
    expect(card.switching).toEqual({ gymName: 'Otro Gym', affiliationId: SEDE });
  });
  it('turns the ranking 403 into a state, never an error', () => {
    expect(gymMembershipGate({ code: 'GYM_MEMBERSHIP_REQUIRED', details: { status: 'REQUESTED' } })).toBe('REQUESTED');
    expect(gymMembershipGate({ code: 'GYM_MEMBERSHIP_REQUIRED' })).toBe('NONE');
    expect(gymMembershipGate({ code: 'FORBIDDEN' })).toBeNull();
    expect(gymGateCopy('NONE').action).toBe('Buscar mi gimnasio');
  });
});
