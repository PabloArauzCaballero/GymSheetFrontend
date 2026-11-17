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

test('con acceso rápido, aparca el refresh en vez de revocarlo y borra lo local', async () => {
  const parked: string[] = [];
  const { calls, steps } = recorder({
    parkForQuickLogin: async (token) => {
      parked.push(token);
      return true;
    },
  });
  await endSession(steps);
  assert.deepEqual(parked, ['r'.repeat(64)]);
  assert.deepEqual(calls, ['push', 'read', 'clear']);
});

test('si aparcar falla o se cancela, revoca como siempre', async () => {
  for (const park of [async () => false, async () => Promise.reject(new Error('cancelado'))]) {
    const { calls, steps } = recorder({ parkForQuickLogin: park });
    await endSession(steps);
    assert.deepEqual(calls, ['push', 'read', 'revoke:64', 'clear']);
  }
});

test('borra el archivo de datos descargado aunque falle, después de los tokens', async () => {
  const { calls, steps } = recorder({
    revokeRefreshToken: async () => {
      throw new Error('offline');
    },
    clearCachedFiles: async () => {
      calls.push('files');
      throw new Error('disk');
    },
  });
  await endSession(steps);
  assert.deepEqual(calls, ['push', 'read', 'clear', 'files']);
});
