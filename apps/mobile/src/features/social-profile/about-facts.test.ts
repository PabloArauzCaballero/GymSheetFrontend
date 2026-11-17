/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { aboutFacts, hasAbout } from './about-facts.ts';

const blank = { interests: [], drinking: null, smoking: null, pets: null, bio: null };

test('orientation is shown only when the server sent it', () => {
  assert.deepEqual(aboutFacts(blank), []);
  assert.deepEqual(
    aboutFacts({ ...blank, orientation: 'BISEXUAL', pets: 'DOG' }).map((fact) => fact.label),
    ['Bisexual', 'Perro'],
  );
});

test('an untouched or whitespace-only profile shows nothing', () => {
  assert.equal(hasAbout(undefined), false);
  assert.equal(hasAbout({ ...blank, bio: '   ' }), false);
  assert.equal(hasAbout({ ...blank, interests: ['RUNNING'] }), true);
  assert.equal(hasAbout({ ...blank, smoking: 'NEVER' }), true);
});
