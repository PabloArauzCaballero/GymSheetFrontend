/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { discoveryIntentsSchema } from '@gymsheet/schemas';
import {
  draftFromProfile,
  emptyDraft,
  isGenderChoiceSelected,
  missingPhotos,
  sameDraft,
  selectGenders,
  toUpdateInput,
  toggleIntent,
  toggleInterest,
  toggleSingle,
} from './selection.ts';

test('UNSURE clears every other intent and is cleared by any of them', () => {
  assert.deepEqual(toggleIntent(['TRAINING', 'DATING'], 'UNSURE'), ['UNSURE']);
  assert.deepEqual(toggleIntent(['UNSURE'], 'FRIENDSHIP'), ['FRIENDSHIP']);
  assert.deepEqual(toggleIntent(['UNSURE'], 'UNSURE'), []);
  assert.deepEqual(toggleIntent(['TRAINING'], 'DATING'), ['TRAINING', 'DATING']);
  assert.deepEqual(toggleIntent(['TRAINING', 'DATING'], 'TRAINING'), ['DATING']);
});

test('any sequence of taps yields intents the shared schema accepts', () => {
  const taps = ['TRAINING', 'UNSURE', 'DATING', 'FRIENDSHIP', 'UNSURE', 'TRAINING', 'DATING'] as const;
  let current: ReturnType<typeof toggleIntent> = [];
  for (const tap of taps) {
    current = toggleIntent(current, tap);
    if (current.length > 0) assert.equal(discoveryIntentsSchema.safeParse(current).success, true, current.join());
  }
});

test('«Todos» selects both genders and a single chip narrows to it', () => {
  assert.deepEqual(selectGenders([], 'ALL'), ['MALE', 'FEMALE']);
  assert.deepEqual(selectGenders(['MALE', 'FEMALE'], 'ALL'), []);
  assert.deepEqual(selectGenders(['MALE', 'FEMALE'], 'FEMALE'), ['FEMALE']);
  assert.deepEqual(selectGenders(['MALE'], 'MALE'), []);
  assert.equal(isGenderChoiceSelected(['MALE', 'FEMALE'], 'ALL'), true);
  assert.equal(isGenderChoiceSelected(['MALE', 'FEMALE'], 'MALE'), false);
  assert.equal(isGenderChoiceSelected(['FEMALE'], 'FEMALE'), true);
});

test('interests stop at the limit instead of replacing one silently', () => {
  const five = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(toggleInterest(five, 'f', 5), { next: five, limited: true });
  assert.deepEqual(toggleInterest(five, 'c', 5), { next: ['a', 'b', 'd', 'e'], limited: false });
  assert.deepEqual(toggleInterest(['a'], 'b', 5), { next: ['a', 'b'], limited: false });
});

test('a second tap clears a single choice', () => {
  assert.equal(toggleSingle<'NEVER' | 'OFTEN'>('NEVER', 'NEVER'), null);
  assert.equal(toggleSingle<'NEVER' | 'OFTEN'>('NEVER', 'OFTEN'), 'OFTEN');
});

test('the update sends every field, clears an empty bio and hides a missing orientation', () => {
  const input = toUpdateInput({ ...emptyDraft, bio: '   ', orientationVisible: true }, 3);
  assert.deepEqual(input, {
    interests: [],
    drinking: null,
    smoking: null,
    pets: null,
    orientation: null,
    orientationVisible: false,
    bio: null,
    expectedVersion: 3,
  });
  assert.equal(toUpdateInput({ ...emptyDraft, bio: ' Hola ' }, 0).bio, 'Hola');
});

test('orientation stays hidden by default and drafts compare by what is sent', () => {
  assert.equal(emptyDraft.orientationVisible, false);
  const draft = draftFromProfile({
    configured: true, orientation: null, orientationVisible: false, interests: ['x'],
    drinking: null, smoking: null, pets: 'DOG', bio: null, version: 2,
  });
  assert.equal(sameDraft(draft, { ...draft, bio: '  ' }), true);
  assert.equal(sameDraft(draft, { ...draft, pets: null }), false);
});

test('two photos are needed to appear in Conocer', () => {
  assert.equal(missingPhotos(0), 2);
  assert.equal(missingPhotos(1), 1);
  assert.equal(missingPhotos(4), 0);
});
