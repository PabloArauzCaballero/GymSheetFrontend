import assert from 'node:assert/strict';
import { test } from 'node:test';
import { afterSheetCloses } from './after-sheet-closes.ts';

test('iOS waits for onDismiss and runs the choice once', () => {
  const ran: string[] = [];
  const queue = afterSheetCloses<string>('ios', (choice) => ran.push(choice));
  queue.choose('library');
  assert.deepEqual(ran, []);
  queue.dismissed();
  queue.dismissed();
  assert.deepEqual(ran, ['library']);
});

test('a dismiss without a choice (× or the scrim) runs nothing', () => {
  const ran: string[] = [];
  afterSheetCloses<string>('ios', (choice) => ran.push(choice)).dismissed();
  assert.deepEqual(ran, []);
});

test('Android and web run the choice right away', () => {
  for (const os of ['android', 'web']) {
    const ran: string[] = [];
    const queue = afterSheetCloses<string>(os, (choice) => ran.push(choice));
    queue.choose('camera');
    assert.deepEqual(ran, ['camera']);
    queue.dismissed();
    assert.deepEqual(ran, ['camera']);
  }
});
