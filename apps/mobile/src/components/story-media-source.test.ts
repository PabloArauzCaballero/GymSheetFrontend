import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveStoryMediaSource } from './story-media-source.ts';

test('resolves API-relative story media under the configured API prefix', () => {
  assert.equal(
    resolveStoryMediaSource('/me/stories/story-1/media', 'https://api.example.test/api/v1'),
    'https://api.example.test/api/v1/me/stories/story-1/media',
  );
});

test('keeps same-origin absolute media URLs on the API origin', () => {
  assert.equal(
    resolveStoryMediaSource('https://api.example.test/api/v1/me/stories/story-1/media', 'https://api.example.test/api/v1'),
    'https://api.example.test/api/v1/me/stories/story-1/media',
  );
});

test('rejects external, protocol-relative, and malformed story media URLs', () => {
  assert.equal(resolveStoryMediaSource('https://storage.example.test/story.jpg', 'https://api.example.test/api/v1'), null);
  assert.equal(resolveStoryMediaSource('//storage.example.test/story.jpg', 'https://api.example.test/api/v1'), null);
  assert.equal(resolveStoryMediaSource('%%%bad-url%%%', 'invalid-api-url'), null);
});
