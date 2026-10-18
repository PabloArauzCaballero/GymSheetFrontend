/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { dayOptions, durationLabel, firstAvailableTime, isTimeAvailable, suggestedTime, timeOptions } from './invite-slots.ts';

const friday = new Date(2026, 9, 16, 17, 20);

test('days read as people say them: Hoy, Mañana, then weekday and date', () => {
  const days = dayOptions(friday);
  assert.equal(days.length, 7);
  assert.deepEqual(days[0], { value: '2026-10-16', label: 'Hoy', detail: 'vie 16' });
  assert.deepEqual(days[1], { value: '2026-10-17', label: 'Mañana', detail: 'sáb 17' });
  assert.deepEqual(days[2], { value: '2026-10-18', label: 'dom 18', detail: 'dom 18' });
});

test('crosses month boundaries in local time', () => {
  const days = dayOptions(new Date(2026, 9, 30, 9, 0), 3);
  assert.deepEqual(days.map((day) => day.value), ['2026-10-30', '2026-10-31', '2026-11-01']);
});

test('today only offers slots at least 15 minutes ahead', () => {
  const today = timeOptions('2026-10-16', friday);
  assert.equal(today[0], '18:00');
  assert.equal(today.at(-1), '23:00');
  assert.equal(timeOptions('2026-10-16', new Date(2026, 9, 16, 17, 10))[0], '17:30');
});

test('other days offer every half hour from 05:00 to 23:00', () => {
  const slots = timeOptions('2026-10-17', friday);
  assert.equal(slots[0], '05:00');
  assert.equal(slots.at(-1), '23:00');
  assert.equal(slots.length, 37);
});

test('durations are short and readable', () => {
  assert.equal(durationLabel(45), '45 min');
  assert.equal(durationLabel(60), '1 h');
  assert.equal(durationLabel(90), '1 h 30');
});

test('a time today needs 15 minutes of margin; other days only the 05:00–23:00 window', () => {
  assert.equal(isTimeAvailable('2026-10-16', '17:30', friday), false);
  assert.equal(isTimeAvailable('2026-10-16', '17:45', friday), true);
  assert.equal(isTimeAvailable('2026-10-17', '04:45', friday), false);
  assert.equal(isTimeAvailable('2026-10-17', '23:15', friday), false);
  assert.equal(isTimeAvailable('2026-10-17', '06:15', friday), true);
});

test('the first free time steps by quarter hours and runs out late at night', () => {
  assert.equal(firstAvailableTime('2026-10-16', friday), '17:45');
  assert.equal(firstAvailableTime('2026-10-17', friday), '05:00');
  assert.equal(firstAvailableTime('2026-10-16', new Date(2026, 9, 16, 22, 50)), null);
});

test('the picker opens at a sensible hour, never before 07:00', () => {
  assert.equal(suggestedTime('2026-10-17', friday), '07:00');
  assert.equal(suggestedTime('2026-10-16', friday), '17:45');
});
