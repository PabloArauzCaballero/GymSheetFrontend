/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { MyVerification } from '@gymsheet/schemas';
import { activeChallenge, selfieFromAsset, verificationCtaDismissal, verificationStep } from './verification-logic.ts';

const challenge = {
  id: '0190e2cb-a6d4-7ec3-8f91-a6c735631501',
  gesture: { code: 'OPEN_PALM', instruction: 'Muestra la palma abierta junto a tu cara' },
  expiresAt: '2026-11-16T10:10:00.000Z',
};
const status = (value: MyVerification['status'], withChallenge = false): MyVerification => ({
  status: value,
  verifiedAt: null,
  challenge: withChallenge ? challenge : null,
  lastDecision: null,
  canRetryAt: null,
});
const base = { status: status('NONE'), failed: false, challenge: null, secondsLeft: 0, expiredByServer: false, unavailable: false };

test('the camera step needs an open challenge with time left', () => {
  assert.equal(verificationStep(base), 'status');
  assert.equal(verificationStep({ ...base, challenge, secondsLeft: 30 }), 'capture');
  assert.equal(verificationStep({ ...base, challenge, secondsLeft: 0 }), 'expired');
  assert.equal(verificationStep({ ...base, challenge, secondsLeft: 30, expiredByServer: true }), 'expired');
});

test('503 unavailable wins over everything; loading and error before the status is known', () => {
  assert.equal(verificationStep({ ...base, challenge, secondsLeft: 30, unavailable: true }), 'unavailable');
  assert.equal(verificationStep({ ...base, status: undefined }), 'loading');
  assert.equal(verificationStep({ ...base, status: undefined, failed: true }), 'error');
});

test('resumes the challenge the server holds, but only while it awaits the upload', () => {
  assert.equal(activeChallenge(null, status('PENDING_UPLOAD', true)), challenge);
  assert.equal(activeChallenge(null, status('PENDING_REVIEW', true)), null);
  const fresh = { ...challenge, id: '0190e2cb-a6d4-7ec3-8f91-a6c735631502' };
  assert.equal(activeChallenge(fresh, status('PENDING_UPLOAD', true)), fresh);
});

test('only JPEG, PNG or HEIC under the backend size limit are sent', () => {
  assert.deepEqual(selfieFromAsset({ uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileName: null }), {
    uri: 'file:///a.jpg',
    name: 'selfie.jpg',
    mimeType: 'image/jpeg',
  });
  assert.equal((selfieFromAsset({ uri: 'file:///b.heic', mimeType: 'image/heic' }) as { name: string }).name, 'selfie.heic');
  assert.ok('error' in selfieFromAsset({ uri: 'file:///c.gif', mimeType: 'image/gif' }));
  assert.ok('error' in selfieFromAsset({ uri: 'file:///d.jpg', mimeType: 'image/jpeg', fileSize: 6 * 1024 * 1024 }));
});

test('«Ahora no» is in memory and notifies listeners', () => {
  verificationCtaDismissal.reset();
  let calls = 0;
  const stop = verificationCtaDismissal.subscribe(() => {
    calls += 1;
  });
  verificationCtaDismissal.dismiss();
  assert.equal(verificationCtaDismissal.get(), true);
  stop();
  verificationCtaDismissal.reset();
  assert.equal(calls, 1);
  assert.equal(verificationCtaDismissal.get(), false);
});
