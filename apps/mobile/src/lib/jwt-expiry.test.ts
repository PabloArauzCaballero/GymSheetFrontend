/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { isTokenExpiring, jwtExpiresAtMs } from './jwt-expiry.ts';

function tokenWith(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.firma`;
}

test('reads the expiry of an access token', () => {
  assert.equal(jwtExpiresAtMs(tokenWith({ sub: 'u', exp: 1_792_337_921 })), 1_792_337_921_000);
  assert.equal(jwtExpiresAtMs('no-es-un-jwt'), null);
  assert.equal(jwtExpiresAtMs(null), null);
});

test('a token close to its 15-minute expiry (or unreadable) must be renewed before loading chat media', () => {
  const exp = 1_792_337_921;
  const token = tokenWith({ exp });
  assert.equal(isTokenExpiring(token, exp * 1_000 - 5 * 60_000), false);
  assert.equal(isTokenExpiring(token, exp * 1_000 - 30_000), true);
  assert.equal(isTokenExpiring(token, exp * 1_000 + 1), true);
  assert.equal(isTokenExpiring(null, 0), true);
});
