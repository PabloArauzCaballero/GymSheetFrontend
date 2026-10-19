/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import type { Message } from '@gymsheet/schemas';
import { patchChatMessageCache } from './chat-message-edit-cache.ts';

const original: Message = {
  id: '00000000-0000-4000-8000-000000000001',
  conversationId: '00000000-0000-4000-8000-000000000002',
  senderId: '00000000-0000-4000-8000-000000000003',
  body: 'original',
  type: 'text',
  storyReference: null,
  mediaUrl: null,
  mediaMimeType: null,
  viewOnce: false,
  viewed: false,
  locationLat: null,
  locationLng: null,
  createdAt: '2026-10-09T10:00:00.000Z',
  editedAt: null,
  deletedAt: null,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test('cancels an in-flight history request before caching the edited message', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const queryKey = ['chat', 'messages', original.conversationId] as const;
  const edited: Message = { ...original, body: 'edited', editedAt: '2026-10-09T10:01:00.000Z' };
  const history = deferred<Message[]>();
  client.setQueryData(queryKey, [original]);

  const staleFetch = client.fetchQuery({
    queryKey,
    queryFn: () => history.promise,
    staleTime: 0,
  }).catch(() => undefined);
  assert.equal(client.getQueryState(queryKey)?.fetchStatus, 'fetching');

  const applied = await patchChatMessageCache({
    queryClient: client,
    conversationId: original.conversationId,
    updated: edited,
    isCurrent: () => true,
    getDeletedMessageIds: () => new Set(),
  });
  assert.equal(applied, true);
  assert.equal(client.getQueryState(queryKey)?.fetchStatus, 'idle');
  assert.equal(client.getQueryData<Message[]>(queryKey)?.[0]?.body, 'edited');

  history.resolve([{ ...original, body: 'stale history response' }]);
  await staleFetch;
  assert.equal(client.getQueryData<Message[]>(queryKey)?.[0]?.body, 'edited');
  client.clear();
});

test('does not cache an update after the conversation becomes unavailable', async () => {
  const client = new QueryClient();
  const queryKey = ['chat', 'messages', original.conversationId] as const;
  client.setQueryData(queryKey, [original]);

  const applied = await patchChatMessageCache({
    queryClient: client,
    conversationId: original.conversationId,
    updated: { ...original, body: 'edited', editedAt: '2026-10-09T10:01:00.000Z' },
    isCurrent: () => false,
    getDeletedMessageIds: () => new Set(),
  });

  assert.equal(applied, false);
  assert.equal(client.getQueryData<Message[]>(queryKey)?.[0]?.body, 'original');
  client.clear();
});

test('does not cache system events as message edit responses', async () => {
  const client = new QueryClient();
  const event: Message = {
    id: '00000000-0000-4000-8000-000000000005',
    conversationId: original.conversationId,
    senderId: null,
    type: 'system',
    systemEvent: {
      kind: 'TRAINING_INVITE_ACCEPTED',
      invitationId: '00000000-0000-4000-8000-000000000006',
      acceptedRevision: 2,
      startsAt: '2026-10-11T15:00:00.000Z',
      timeZone: 'America/La_Paz',
      placeLabel: 'Gimnasio Central',
    },
    createdAt: original.createdAt,
  };

  const applied = await patchChatMessageCache({
    queryClient: client,
    conversationId: original.conversationId,
    updated: event,
    isCurrent: () => true,
    getDeletedMessageIds: () => new Set(),
  });

  assert.equal(applied, false);
  assert.equal(client.getQueryData<Message[]>(['chat', 'messages', original.conversationId]), undefined);
  client.clear();
});

test('seeds and reloads history when an edit arrives during the first history request', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const queryKey = ['chat', 'messages', original.conversationId] as const;
  const edited: Message = { ...original, body: 'edited', editedAt: '2026-10-09T10:01:00.000Z' };
  const firstRequest = deferred<Message[]>();
  const completeHistory: Message[] = [edited, { ...original, id: '00000000-0000-4000-8000-000000000004', body: 'other' }];
  let calls = 0;
  const observer = new QueryObserver<Message[]>(client, {
    queryKey,
    queryFn: () => ++calls === 1 ? firstRequest.promise : Promise.resolve(completeHistory),
    retry: false,
  });
  const unsubscribe = observer.subscribe(() => undefined);
  assert.equal(client.getQueryState(queryKey)?.fetchStatus, 'fetching');

  const applied = await patchChatMessageCache({
    queryClient: client,
    conversationId: original.conversationId,
    updated: edited,
    isCurrent: () => true,
    getDeletedMessageIds: () => new Set(),
  });

  assert.equal(applied, true);
  assert.equal(calls, 2, 'invalidating the active query should reload complete history');
  assert.deepEqual(client.getQueryData<Message[]>(queryKey), completeHistory);
  firstRequest.resolve([{ ...original, body: 'stale first response' }]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(client.getQueryData<Message[]>(queryKey), completeHistory);
  unsubscribe();
  client.clear();
});

test('keeps a tombstone when a delayed edit arrives', async () => {
  const client = new QueryClient();
  const queryKey = ['chat', 'messages', original.conversationId] as const;
  const tombstone = { ...original, body: 'Mensaje eliminado', deletedAt: '2026-10-09T10:02:00.000Z' };
  client.setQueryData(queryKey, [tombstone]);

  await patchChatMessageCache({
    queryClient: client,
    conversationId: original.conversationId,
    updated: { ...original, body: 'late edit', editedAt: '2026-10-09T10:01:00.000Z' },
    isCurrent: () => true,
    getDeletedMessageIds: () => new Set([original.id]),
  });

  assert.deepEqual(client.getQueryData<Message[]>(queryKey), [tombstone]);
  client.clear();
});
