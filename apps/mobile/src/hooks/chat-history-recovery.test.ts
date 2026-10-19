import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cachedMessagesWhileAccessPending,
  canWriteWhileHistoryAccessPending,
  historyCacheReplacementForError,
  recoverFromHistoryError,
  viewerUriWhileHistoryAccessPending,
} from './chat-history-recovery.ts';

test('foreground access validation hides cached messages until the request settles', () => {
  const cachedMessages = [{ id: 'cached-message', mediaUrl: '/private/attachment.jpg' }];
  assert.deepEqual(cachedMessagesWhileAccessPending(cachedMessages, true), []);
  assert.equal(cachedMessagesWhileAccessPending(cachedMessages, false), cachedMessages);
});

test('foreground access validation blocks writes until the request settles', () => {
  assert.equal(canWriteWhileHistoryAccessPending(true, true), false);
  assert.equal(canWriteWhileHistoryAccessPending(true, false), true);
  assert.equal(canWriteWhileHistoryAccessPending(false, false), false);
});

test('foreground access validation hides a previously revealed viewer URL', () => {
  const privateViewerUri = '/private/view-once.jpg';
  assert.equal(viewerUriWhileHistoryAccessPending(privateViewerUri, true), null);
  assert.equal(viewerUriWhileHistoryAccessPending(privateViewerUri, false), privateViewerUri);
});

test('404 recovery writes an empty value to the message query cache', () => {
  const queryCache = new Map([['conversation', [{ id: 'cached-message' }]]]);
  const replacement = historyCacheReplacementForError({ status: 404 });
  if (replacement !== null) queryCache.set('conversation', replacement);

  assert.deepEqual(queryCache.get('conversation'), []);
  assert.equal(historyCacheReplacementForError({ status: 503 }), null);
});

test('resume refetch 404 without conversation:revoked hides cached history and revealed media', () => {
  const cached = {
    history: [{ id: 'cached-message', mediaUrl: '/private/attachment.jpg' }],
    olderMessages: [{ id: 'older-message' }],
    liveMessages: [{ id: 'live-message' }],
    revealedMedia: { 'view-once': { mediaUrl: '/private/view-once.jpg' } },
    viewerUri: '/private/view-once.jpg',
    unavailable: false,
  };

  const recovered = recoverFromHistoryError(
    cached,
    { status: 404 },
  );

  assert.deepEqual(recovered, {
    history: [],
    olderMessages: [],
    liveMessages: [],
    revealedMedia: {},
    viewerUri: null,
    unavailable: true,
  });
});

test('non-404 history errors preserve cached state', () => {
  const cached = {
    history: [{ id: 'cached-message' }],
    olderMessages: [],
    liveMessages: [],
    revealedMedia: { 'view-once': { mediaUrl: '/private/view-once.jpg' } },
    viewerUri: '/private/view-once.jpg',
    unavailable: false,
  };
  const error = { status: 503 };

  assert.equal(recoverFromHistoryError(cached, error), cached);
});
