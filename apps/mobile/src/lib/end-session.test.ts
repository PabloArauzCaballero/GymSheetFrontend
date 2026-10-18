/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { endSession, type EndSessionSteps } from './end-session.ts';

function recorder(overrides: Partial<EndSessionSteps> = {}) {
  const calls: string[] = [];
  const steps: EndSessionSteps = {
    unregisterPush: async () => {
      calls.push('push');
    },
    getRefreshToken: async () => {
      calls.push('read');
      return 'r'.repeat(64);
    },
    revokeRefreshToken: async (token) => {
      calls.push(`revoke:${token.length}`);
    },
    clearTokens: async () => {
      calls.push('clear');
    },
    ...overrides,
  };
  return { calls, steps };
}

test('revoca en el servidor el refresh guardado y después borra lo local', async () => {
  const { calls, steps } = recorder();
  await endSession(steps);
  assert.deepEqual(calls, ['push', 'read', 'revoke:64', 'clear']);
});

test('lee el refresh después de la baja del push, que puede haberlo rotado', async () => {
  let current = 'viejo';
  const revoked: string[] = [];
  await endSession({
    unregisterPush: async () => {
      current = 'nuevo';
    },
    getRefreshToken: async () => current,
    revokeRefreshToken: async (token) => {
      revoked.push(token);
    },
    clearTokens: async () => {},
  });
  assert.deepEqual(revoked, ['nuevo']);
});

test('sin refresh guardado no llama al servidor pero borra igual', async () => {
  const { calls, steps } = recorder({ getRefreshToken: async () => null });
  await endSession(steps);
  assert.deepEqual(calls, ['push', 'clear']);
});

test('borra los tokens aunque fallen el push y la revocación', async () => {
  const { calls, steps } = recorder({
    unregisterPush: async () => {
      throw new Error('sin red');
    },
    revokeRefreshToken: async () => {
      throw new Error('sin red');
    },
  });
  await endSession(steps);
  assert.deepEqual(calls, ['read', 'clear']);
});
