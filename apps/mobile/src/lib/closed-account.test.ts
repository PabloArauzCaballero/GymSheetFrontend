/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { wipeClosedAccount, type ClosedAccountSteps } from './closed-account.ts';

function recorder(overrides: Partial<ClosedAccountSteps> = {}) {
  const calls: string[] = [];
  const steps: ClosedAccountSteps = {
    clearTokens: async () => { calls.push('tokens'); },
    disableQuickLogin: async () => { calls.push('quick-login'); },
    signOut: () => { calls.push('sign-out'); },
    clearCaches: [() => { calls.push('queries'); }, async () => { calls.push('disk'); }],
    ...overrides,
  };
  return { calls, steps };
}

test('forgets tokens and quick login, signs out, then drops the caches, with no server call', async () => {
  const { calls, steps } = recorder();
  assert.deepEqual(await wipeClosedAccount(steps), []);
  assert.deepEqual(calls, ['tokens', 'quick-login', 'sign-out', 'queries', 'disk']);
});

test('a Keychain error never leaves the rest behind', async () => {
  const keychain = new Error('keychain');
  const { calls, steps } = recorder({
    clearTokens: async () => { throw keychain; },
    disableQuickLogin: async () => { throw new Error('biometric'); },
  });
  const failures = await wipeClosedAccount(steps);
  assert.equal(failures.length, 2);
  assert.equal(failures[0], keychain);
  assert.deepEqual(calls, ['sign-out', 'queries', 'disk']);
});

test('a failing cache does not stop the next one', async () => {
  const { calls, steps } = recorder({
    clearCaches: [() => { throw new Error('x'); }, async () => { calls.push('disk'); }],
  });
  await wipeClosedAccount(steps);
  assert.deepEqual(calls, ['tokens', 'quick-login', 'sign-out', 'disk']);
});
