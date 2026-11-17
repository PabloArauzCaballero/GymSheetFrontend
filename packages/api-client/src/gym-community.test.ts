import { describe, expect, it } from 'vitest';
import { discoveryCardSchema, gymDirectoryEntrySchema } from '@gymsheet/schemas';

const ID = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const card = { userId: ID, displayName: 'Ana P.', objetivo: null, branchId: null, branchName: null, connectionStatus: 'NONE', connectionId: null, socialStatus: null, photoUrl: null, photos: [], age: null, gender: null, experienceLevel: null, points: null, levelCode: null };

describe('gym community on the cards (ADR-0027)', () => {
  it('reads a card with or without «Socio de X»', () => {
    expect(gymDirectoryEntrySchema.parse(card).gymBadge).toBeUndefined();
    expect(gymDirectoryEntrySchema.parse({ ...card, gymBadge: null }).gymBadge).toBeNull();
    expect(gymDirectoryEntrySchema.parse({ ...card, gymBadge: { id: ID, name: 'Top', handle: 'top', logoUrl: null } }).gymBadge?.name).toBe('Top');
  });
  it('keeps SAME_GYM among the deck reasons', () => {
    expect(discoveryCardSchema.parse({ ...card, reasons: ['SAME_GYM', 'TRAINING_NOW'], distanceKm: null }).reasons).toEqual(['SAME_GYM']);
  });
});
