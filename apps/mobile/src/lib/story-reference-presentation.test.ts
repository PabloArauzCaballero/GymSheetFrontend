/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { storyReferenceLabel } from './story-reference-presentation.ts';

test('keeps the normal story reference label while the story is available', () => {
  assert.equal(storyReferenceLabel(true), 'Respuesta a una story');
});

test('announces expired or removed stories as unavailable', () => {
  assert.equal(storyReferenceLabel(false), 'Historia no disponible');
});
