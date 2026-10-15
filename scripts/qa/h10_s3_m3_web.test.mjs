import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarUid, parseArgs } from './h10_s3_m3_web.mjs';

test('parses the stable UID from a folded calendar', () => {
  const ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:meeting-\r\n stable@example.invalid\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
  assert.equal(calendarUid(ics), 'meeting-stable@example.invalid');
});

test('rejects malformed and duplicate UIDs', () => {
  assert.throws(() => calendarUid('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n'), /exactly one UID/u);
  assert.throws(() => calendarUid('BEGIN:VCALENDAR\r\nUID:a\r\nUID:b\r\nEND:VCALENDAR\r\n'), /exactly one UID/u);
  assert.throws(() => calendarUid('BEGIN:VCALENDAR\nUID:a\nEND:VCALENDAR\n'), /complete VCALENDAR/u);
});

test('requires the fixed runner identity arguments', () => {
  assert.deepEqual(parseArgs(['--case', 'H10.S3.M3', '--role', 'A_WEB', '--run-id', 'qa-1', '--evidence-dir', '/tmp']), {
    caseId: 'H10.S3.M3', role: 'A_WEB', runId: 'qa-1', evidenceDir: '/tmp',
  });
  assert.throws(() => parseArgs(['--case', 'H10.S3.M3']), /missing role/u);
});
