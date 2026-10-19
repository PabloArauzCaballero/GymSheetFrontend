import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarUid } from './calendar-ics-contract.ts';

const uid = 'gymsheet-11111111-1111-4111-8111-111111111111-22222222-2222-4222-8222-222222222222';

function event(status = 'CONFIRMED') {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:${uid.slice(0, 68)}`,
    ` ${uid.slice(68)}`,
    `STATUS:${status}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

test('re-exported and cancelled ICS retain the server UID across folded lines', () => {
  assert.equal(calendarUid(event()), uid);
  assert.equal(calendarUid(event('CANCELLED')), uid);
});

test('invalid or ambiguous ICS cannot be shared as an event', () => {
  assert.throws(() => calendarUid('not an ICS'), /calendario válido/u);
  assert.throws(() => calendarUid(event().replace('UID:', 'X-UID:')), /identificador/u);
  assert.throws(() => calendarUid(event().replace('STATUS:', `UID:other\r\nSTATUS:`)), /identificador/u);
});
