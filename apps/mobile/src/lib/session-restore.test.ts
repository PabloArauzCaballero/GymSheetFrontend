/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { restoreSession, type RestoreSessionSteps } from './session-restore.ts';

type P = { id: string; nombre: string };
const rejected = new Error('401');
const offline = new Error('sin red');

function harness(overrides: Partial<RestoreSessionSteps<P>>) {
  const log: string[] = [];
  const steps: RestoreSessionSteps<P> = {
    hasAccessToken: async () => true,
    readCachedPrincipal: async () => ({ id: '1', nombre: 'copia' }),
    fetchPrincipal: async () => ({ id: '1', nombre: 'servidor' }),
    isSessionRejected: (error) => error === rejected,
    authenticate: (principal, origin) => {
      log.push(`auth:${origin}:${principal.nombre}`);
    },
    signOut: () => {
      log.push('signOut');
    },
    showLogin: () => {
      log.push('login');
    },
    ...overrides,
  };
  return { log, steps };
}

test('sin token va al acceso sin preguntar al servidor', async () => {
  let asked = false;
  const { log, steps } = harness({
    hasAccessToken: async () => false,
    fetchPrincipal: async () => {
      asked = true;
      return { id: '1', nombre: 'x' };
    },
  });
  await restoreSession(steps);
  assert.deepEqual(log, ['login']);
  assert.equal(asked, false);
});

test('con copia entra al momento y la refresca con /auth/me', async () => {
  const { log, steps } = harness({});
  await restoreSession(steps);
  assert.deepEqual(log, ['auth:cache:copia', 'auth:server:servidor']);
});

test('sin red y con copia la sesión sigue abierta y no se borra nada', async () => {
  const { log, steps } = harness({
    fetchPrincipal: async () => {
      throw offline;
    },
  });
  await restoreSession(steps);
  assert.deepEqual(log, ['auth:cache:copia']);
});

test('sin red y sin copia muestra el acceso pero no borra los tokens', async () => {
  const { log, steps } = harness({
    readCachedPrincipal: async () => null,
    fetchPrincipal: async () => {
      throw offline;
    },
  });
  await restoreSession(steps);
  assert.deepEqual(log, ['login']);
});

test('un rechazo del servidor cierra la sesión aunque hubiera copia', async () => {
  const { log, steps } = harness({
    fetchPrincipal: async () => {
      throw rejected;
    },
  });
  await restoreSession(steps);
  assert.deepEqual(log, ['auth:cache:copia', 'signOut']);
});
