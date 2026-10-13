import test from 'node:test';
import assert from 'node:assert/strict';
import { isMessageReadByOther } from '../src/read-receipt.ts';

test('messages read before read receipts were enabled never appear read retroactively', () => {
  const enabledSince = '2026-10-08T10:00:00.000Z';
  const readAt = '2026-10-08T10:05:00.000Z';
  assert.equal(isMessageReadByOther('2026-10-08T09:59:59.000Z', readAt, enabledSince), false);
  assert.equal(isMessageReadByOther('2026-10-08T10:00:00.000Z', readAt, enabledSince), true);
  assert.equal(isMessageReadByOther('2026-10-08T10:06:00.000Z', readAt, enabledSince), false);
});

test('an always-enabled receipt interval has no lower timestamp bound', () => {
  assert.equal(isMessageReadByOther('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', null), true);
});
