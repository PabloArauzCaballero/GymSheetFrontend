/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatMessage, Message } from '@gymsheet/schemas';
import { buildChatRows, dayLabel, rowIndexOf } from './chat-timeline.ts';

const me = '00000000-0000-4000-8000-000000000003';
const other = '00000000-0000-4000-8000-000000000004';
const now = new Date(2026, 9, 18, 12, 0);

function msg(id: string, senderId: string, date: Date): ChatMessage {
  return {
    id, conversationId: '00000000-0000-4000-8000-000000000002', senderId, body: id, type: 'text',
    storyReference: null, mediaUrl: null, mediaMimeType: null, viewOnce: false, viewed: false,
    locationLat: null, locationLng: null, createdAt: date.toISOString(), editedAt: null, deletedAt: null,
  };
}

test('day labels read like WhatsApp', () => {
  assert.equal(dayLabel(new Date(2026, 9, 18, 0, 5).toISOString(), now), 'Hoy');
  assert.equal(dayLabel(new Date(2026, 9, 17, 23, 55).toISOString(), now), 'Ayer');
  assert.match(dayLabel(new Date(2026, 9, 14, 9).toISOString(), now), /^[A-ZÁÉÍÓÚ][a-záéíóú]+$/u);
  assert.match(dayLabel(new Date(2026, 8, 2, 9).toISOString(), now), /2 de septiembre/u);
  assert.match(dayLabel(new Date(2025, 8, 2, 9).toISOString(), now), /2025/u);
});

test('rows put the day separator above the first message of each day (inverted list)', () => {
  // Newest first, like the inverted FlatList.
  const timeline: Message[] = [
    msg('c', me, new Date(2026, 9, 18, 11, 0)),
    msg('b', me, new Date(2026, 9, 18, 10, 58)),
    msg('a', other, new Date(2026, 9, 17, 20, 0)),
  ];
  const rows = buildChatRows(timeline, now);
  assert.deepEqual(rows.map((row) => (row.kind === 'day' ? `[${row.label}]` : row.message.id)), ['c', 'b', '[Hoy]', 'a', '[Ayer]']);
  assert.equal(rowIndexOf(rows, 'a'), 3);
  assert.equal(rowIndexOf(rows, 'zzz'), -1);
});

test('consecutive bubbles of the same author group; only the newest of a group keeps the tail', () => {
  const timeline: Message[] = [
    msg('d', other, new Date(2026, 9, 18, 11, 30)),
    msg('c', me, new Date(2026, 9, 18, 11, 2)),
    msg('b', me, new Date(2026, 9, 18, 11, 1)),
    msg('a', me, new Date(2026, 9, 18, 10, 0)),
  ];
  const rows = buildChatRows(timeline, now).filter((row) => row.kind === 'message');
  const flags = Object.fromEntries(rows.map((row) => [row.message.id, [row.groupedWithOlder, row.groupedWithNewer]]));
  assert.deepEqual(flags.d, [false, false]);
  assert.deepEqual(flags.c, [true, false]);
  assert.deepEqual(flags.b, [false, true]);
  // 61 minutes apart: a new group even from the same author.
  assert.deepEqual(flags.a, [false, false]);
});

test('system notices never group with bubbles', () => {
  const notice: Message = {
    id: 'sys', conversationId: '00000000-0000-4000-8000-000000000002', senderId: null, type: 'system',
    systemEvent: { kind: 'DISAPPEARING_MESSAGES_CHANGED', seconds: 86_400, changedByUserId: me },
    createdAt: new Date(2026, 9, 18, 11, 1).toISOString(),
  };
  const rows = buildChatRows([msg('b', me, new Date(2026, 9, 18, 11, 2)), notice, msg('a', me, new Date(2026, 9, 18, 11, 0))], now);
  const b = rows.find((row) => row.kind === 'message' && row.message.id === 'b');
  assert.equal(b?.kind === 'message' && b.groupedWithOlder, false);
});
