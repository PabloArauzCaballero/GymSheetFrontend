/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { noticeRoute } from './notice-route.ts';

test('export notices open Privacidad y datos', () => {
  assert.deepEqual(noticeRoute({ tipo: 'ACCOUNT_EXPORT_READY' }), { href: '/datos-privacidad', label: 'Ir a descargar mi copia' });
  assert.deepEqual(noticeRoute({ tipo: 'ACCOUNT_EXPORT_FAILED' }), { href: '/datos-privacidad', label: 'Pedir otra copia' });
});

test('any other notice stays a plain notice', () => {
  assert.equal(noticeRoute({ tipo: 'SANCTION' }), null);
  assert.equal(noticeRoute({ tipo: null }), null);
  assert.equal(noticeRoute({}), null);
});
