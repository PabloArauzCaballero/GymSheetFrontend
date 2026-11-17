import {
  discoveryDeckSchema,
  gymDirectoryEntrySchema,
  memberProfileSchema,
  socialMapNearbySchema,
} from '@gymsheet/schemas';
import { describe, expect, it } from 'vitest';
import { connectionOutcomeMessage, isMatchOutcome } from './connection-outcome';
import {
  discoveryReasonChips,
  formatDistanceKm,
  isDiscoveryCard,
  isVerifiedCard,
  verifiedBadgeCopy,
} from './discovery-reasons';

/**
 * What `mapDiscoveryCard` in the backend (franja 5, social.mapper.ts) sends:
 * the directory entry, `impressionId` from the deck flow, `reasons` filtered
 * to the closed list and `distanceKm` as `Math.max(1, Math.round(km))`.
 */
const directoryEntry = {
  userId: '6f1d0c3e-3b4a-4f6e-9a51-2a7c1f0b9d11',
  displayName: 'Ana M.',
  objetivo: 'HIPERTROFIA',
  branchId: 'a9b0c1d2-e3f4-4a5b-8c6d-7e8f9a0b1c2d',
  branchName: 'Sede Centro',
  connectionStatus: 'PENDING_RECEIVED',
  connectionId: 'c0ffee00-1234-4abc-8def-0123456789ab',
  socialStatus: null,
  photoUrl: 'https://media.example.test/a.jpg',
  photos: [
    { id: '0b6a2f7e-1c3d-4e5f-8a9b-0c1d2e3f4a5b', url: 'https://media.example.test/a.jpg' },
    { id: '1c7b3a8f-2d4e-4f60-9b0c-1d2e3f4a5b6c', url: 'https://media.example.test/b.jpg' },
  ],
  age: 29,
  gender: 'FEMALE',
  experienceLevel: 'INTERMEDIATE',
  points: 1250,
  levelCode: 'BRONCE',
  about: { interests: ['RUNNING'], drinking: null, smoking: 'NEVER', pets: null, bio: 'Entreno a las siete.' },
};
const deckCard = {
  ...directoryEntry,
  impressionId: '8e2f4b6a-0c1d-4e3f-a5b6-c7d8e9f0a1b2',
  reasons: ['NEARBY', 'SAME_GOAL', 'VERIFIED'],
  distanceKm: 1,
};

/** The only card of a parsed page; fails the test instead of reading `undefined`. */
function only<T>(items: readonly T[], index = 0): T {
  const item = items[index];
  if (item === undefined) throw new Error(`missing item ${index}`);
  return item;
}

describe('discovery deck schema', () => {
  it('parses a real deck page, including a card the remote ranker left without context', () => {
    const page = discoveryDeckSchema.parse([deckCard, { ...directoryEntry, reasons: [], distanceKm: null }]);
    expect(page[0]).toMatchObject({ reasons: ['NEARBY', 'SAME_GOAL', 'VERIFIED'], distanceKm: 1 });
    expect(only(page).impressionId).toBe(deckCard.impressionId);
    expect(page[1]).toMatchObject({ reasons: [], distanceKm: null });
  });

  it('ignores unknown codes, as the contract asks, and never keeps presence', () => {
    const card = only(discoveryDeckSchema.parse([
      { ...deckCard, reasons: ['TRAINING_NOW', 'ACTIVE_NOW', 'SAME_ROUTINE', 'FUTURE_CODE', 'SAME_ROUTINE'] },
    ]));
    expect(card.reasons).toEqual(['SAME_ROUTINE']);
  });

  it('rejects a card without its required ranking fields or with an exact distance', () => {
    const noReasons: Partial<typeof deckCard> = { ...deckCard };
    delete noReasons.reasons;
    const noDistance: Partial<typeof deckCard> = { ...deckCard };
    delete noDistance.distanceKm;
    expect(discoveryDeckSchema.safeParse([noReasons]).success).toBe(false);
    expect(discoveryDeckSchema.safeParse([noDistance]).success).toBe(false);
    expect(discoveryDeckSchema.safeParse([{ ...deckCard, distanceKm: 0.4 }]).success).toBe(false);
    expect(discoveryDeckSchema.safeParse([{ ...deckCard, distanceKm: 0 }]).success).toBe(false);
  });

  it('keeps orientation only when its owner made it visible (the backend omits it otherwise)', () => {
    const hidden = only(discoveryDeckSchema.parse([deckCard]));
    expect(hidden.about).not.toHaveProperty('orientation');
    const shown = only(discoveryDeckSchema.parse([
      { ...deckCard, about: { ...deckCard.about, orientation: 'BISEXUAL' } },
    ]));
    expect(shown.about?.orientation).toBe('BISEXUAL');
  });

  it('leaves directory, profile and map responses as they were (no ranking context there)', () => {
    expect(isDiscoveryCard(gymDirectoryEntrySchema.parse(directoryEntry))).toBe(false);
    expect(isDiscoveryCard(memberProfileSchema.parse({ ...directoryEntry, badges: [] }))).toBe(false);
    const nearby = socialMapNearbySchema.parse({ preferencesApplied: true, people: [{ ...directoryEntry, distanceKm: 3 }] });
    expect(only(nearby.people).distanceKm).toBe(3);
    expect(isDiscoveryCard(only(discoveryDeckSchema.parse([deckCard])))).toBe(true);
  });
});

describe('discoveryReasonChips', () => {
  const all = ['NEW_HERE', 'NEARBY', 'SHARED_INTERESTS', 'VERIFIED', 'SAME_GOAL', 'SAME_ROUTINE'];

  it('orders by what you share in training and caps at three', () => {
    expect(discoveryReasonChips({ reasons: all, distanceKm: null }).map((chip) => chip.label)).toEqual([
      'Misma rutina',
      'Mismo objetivo',
      'Intereses en común',
    ]);
    expect(discoveryReasonChips({ reasons: all, distanceKm: null }, 5).map((chip) => chip.code)).toEqual([
      'SAME_ROUTINE', 'SAME_GOAL', 'SHARED_INTERESTS', 'NEARBY', 'NEW_HERE',
    ]);
  });

  it('never turns VERIFIED into a chip, and drops NEARBY when the distance is shown', () => {
    expect(discoveryReasonChips({ reasons: ['VERIFIED', 'NEARBY', 'NEW_HERE'], distanceKm: 2 })).toEqual([
      { code: 'NEW_HERE', label: 'Acaba de unirse' },
    ]);
    expect(discoveryReasonChips({ reasons: ['NEARBY'], distanceKm: null })).toEqual([
      { code: 'NEARBY', label: 'Cerca de ti' },
    ]);
  });

  it('never shows presence, even from raw strings an older server might send', () => {
    const labels = discoveryReasonChips({ reasons: ['TRAINING_NOW', 'ACTIVE_NOW'], distanceKm: null });
    expect(labels).toEqual([]);
  });

  it('returns nothing for an empty or zero limit', () => {
    expect(discoveryReasonChips({ reasons: [], distanceKm: 3 })).toEqual([]);
    expect(discoveryReasonChips({ reasons: all, distanceKm: null }, 0)).toEqual([]);
  });
});

describe('formatDistanceKm', () => {
  it.each([
    [0, 'a menos de 1 km'],
    [0.4, 'a menos de 1 km'],
    [1, 'a 1 km'],
    [2, 'a 2 km'],
    [12.6, 'a 13 km'],
    [null, null],
    [undefined, null],
    [-1, null],
    [Number.NaN, null],
  ])('%s → %s', (km, expected) => {
    expect(formatDistanceKm(km)).toBe(expected);
  });
});

describe('verified badge', () => {
  it('reads VERIFIED from the reasons and names the badge for assistive tech', () => {
    expect(isVerifiedCard({ reasons: ['SAME_GOAL', 'VERIFIED'] })).toBe(true);
    expect(isVerifiedCard({ reasons: ['SAME_GOAL'] })).toBe(false);
    expect(verifiedBadgeCopy.accessibleName).toBe('Persona verificada');
    expect(verifiedBadgeCopy.accessibleName.toLowerCase()).toContain(verifiedBadgeCopy.label.toLowerCase());
  });
});

describe('single match model', () => {
  it('tells a match apart from a sent request', () => {
    expect(isMatchOutcome({ status: 'ACCEPTED' })).toBe(true);
    expect(connectionOutcomeMessage({ status: 'ACCEPTED' })).toBe('Hicieron match. Ya pueden escribirse.');
    expect(isMatchOutcome({ status: 'PENDING' })).toBe(false);
    expect(connectionOutcomeMessage({ status: 'PENDING' })).toBe('Solicitud enviada.');
  });
});

describe('SAME_GYM (ADR-0027)', () => {
  it('leads with «Tu mismo gimnasio» when both are confirmed members of the same gym', () => {
    expect(discoveryReasonChips({ reasons: ['NEARBY', 'SAME_GYM'], distanceKm: null }).map((chip) => chip.label)).toEqual(['Tu mismo gimnasio', 'Cerca de ti']);
  });
});
