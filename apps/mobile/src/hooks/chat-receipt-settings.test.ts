/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyReceiptUpdate,
  beginReceiptSettingsChange,
  confirmReceiptSettingsChange,
  createReceiptPolicyState,
  isRelevantReceiptUpdate,
  receiptSettingsAffectConversation,
  visibleReceiptReadAt,
} from './chat-receipt-settings.ts';

test('accepts own settings changes so the current device can clear stale read state', () => {
  assert.equal(isRelevantReceiptUpdate({ userId: 'me', settingsChanged: true }, 'me', 'peer'), true);
});

test('accepts peer read updates but ignores unrelated users', () => {
  assert.equal(isRelevantReceiptUpdate({ userId: 'peer' }, 'me', 'peer'), true);
  assert.equal(isRelevantReceiptUpdate({ userId: 'stranger', settingsChanged: true }, 'me', 'peer'), false);
});

test('does not reset the open chat receipt policy when SELECTED excludes that conversation', () => {
  assert.equal(receiptSettingsAffectConversation({ scope: 'SELECTED', conversationIds: ['other'] }, 'active'), false);
  assert.equal(receiptSettingsAffectConversation({ scope: 'SELECTED', conversationIds: ['active'] }, 'active'), true);
  assert.equal(receiptSettingsAffectConversation({ scope: 'ALL' }, 'active'), true);
});

test('keeps the settings barrier through delivered updates so stale REST read state stays hidden', () => {
  const changed = beginReceiptSettingsChange(createReceiptPolicyState(), 'me');
  const delivered = applyReceiptUpdate(changed, { userId: 'peer', deliveredAt: '2026-10-09T10:01:00.000Z' }, true);
  const reconciled = confirmReceiptSettingsChange(
    delivered,
    true,
    '2026-10-09T10:00:00.000Z',
    '2026-10-09T09:59:00.000Z',
    true,
    'peer',
  );

  assert.equal(reconciled.awaitingFreshRead, true);
  assert.equal(reconciled.cursor?.settingsChanged, true);
  assert.equal(reconciled.cursor?.readAt, undefined);
  assert.equal(reconciled.cursor?.deliveredAt, '2026-10-09T10:01:00.000Z');
  assert.equal(visibleReceiptReadAt(reconciled, true, '2026-10-09T09:59:00.000Z'), null);
});

test('does not let a late read event restore a cursor while read receipts are disabled', () => {
  const changed = beginReceiptSettingsChange(createReceiptPolicyState(), 'me');
  const confirmed = confirmReceiptSettingsChange(changed, false, null, null, true, 'peer');
  const lateRead = applyReceiptUpdate(confirmed, {
    userId: 'peer',
    readAt: '2026-10-09T10:02:00.000Z',
    readFrom: '2026-10-09T10:00:00.000Z',
  }, false);

  assert.equal(lateRead.awaitingFreshRead, true);
  assert.equal(lateRead.cursor?.readAt, undefined);
  assert.equal(visibleReceiptReadAt(lateRead, false, '2026-10-09T09:59:00.000Z'), null);
});

test('releases the barrier only when a fresh server summary supports a read after its cutoff', () => {
  const changed = beginReceiptSettingsChange(createReceiptPolicyState(), 'me');
  const noCursor = confirmReceiptSettingsChange(
    changed,
    true,
    '2026-10-09T10:00:00.000Z',
    null,
    true,
    'peer',
  );
  const supported = confirmReceiptSettingsChange(
    noCursor,
    true,
    '2026-10-09T10:00:00.000Z',
    '2026-10-09T10:02:00.000Z',
    true,
    'peer',
  );

  assert.equal(noCursor.awaitingFreshRead, true);
  assert.equal(supported.awaitingFreshRead, false);
  assert.equal(supported.cursor?.readFrom, '2026-10-09T10:00:00.000Z');
  assert.equal(supported.cursor?.readAt, '2026-10-09T10:02:00.000Z');
});

test('keeps the barrier if settings or conversation refetch did not produce a fresh source', () => {
  const changed = beginReceiptSettingsChange(createReceiptPolicyState(), 'me');
  const notFresh = confirmReceiptSettingsChange(
    changed,
    true,
    '2026-10-09T10:00:00.000Z',
    '2026-10-09T10:02:00.000Z',
    false,
    'peer',
  );

  assert.equal(notFresh.awaitingFreshRead, true);
  assert.equal(notFresh.cursor?.readAt, undefined);
});

test('server cutoffs are unchanged when the client clock is far behind or ahead', () => {
  const originalNow = Date.now;
  const results: Array<ReturnType<typeof createReceiptPolicyState>> = [];
  try {
    for (const offset of [-24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000]) {
      Date.now = () => originalNow() + offset;
      const changed = beginReceiptSettingsChange(createReceiptPolicyState(), 'me');
      results.push(confirmReceiptSettingsChange(
        changed,
        true,
        '2026-10-09T10:00:00.000Z',
        '2026-10-09T10:02:00.000Z',
        true,
        'peer',
      ));
    }
  } finally {
    Date.now = originalNow;
  }
  assert.deepEqual(results[0], results[1]);
  assert.equal(results[0]?.cutoffAt, '2026-10-09T10:00:00.000Z');
  assert.equal(results[0]?.awaitingFreshRead, false);
});
