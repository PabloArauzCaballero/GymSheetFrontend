/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { storyThumbnailUrl } from './story-thumbnail.ts';

const api = 'https://api.example.test/api/v1';
const image = (id: string, viewedByMe: boolean) => ({ mediaUrl: `/api/v1/stories/${id}/media`, mediaType: 'image' as const, viewedByMe });

test('previews the first unviewed story, the one the viewer opens', () => {
  assert.equal(
    storyThumbnailUrl([image('a', true), image('b', false), image('c', false)], api),
    'https://api.example.test/api/v1/stories/b/media',
  );
});

test('with everything viewed it previews the most recent story', () => {
  assert.equal(storyThumbnailUrl([image('a', true), image('b', true)], api), 'https://api.example.test/api/v1/stories/b/media');
});

test('a video keeps the avatar: there is no frame to show', () => {
  assert.equal(storyThumbnailUrl([{ mediaUrl: '/api/v1/stories/v/media', mediaType: 'video', viewedByMe: false }], api), null);
});

test('no stories, no thumbnail', () => {
  assert.equal(storyThumbnailUrl([], api), null);
});

test('a foreign origin never receives the bearer token', () => {
  assert.equal(storyThumbnailUrl([{ mediaUrl: 'https://evil.test/x.jpg', mediaType: 'image', viewedByMe: false }], api), null);
});
