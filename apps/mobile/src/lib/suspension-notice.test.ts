/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { accountSuspensionCopy } from '@gymsheet/domain';
import { endSuspendedSession, loginFailureMessage, suspensionMessage, type SuspendedSessionSteps } from './suspension-notice.ts';

const minor = { code: 'MENOR_DE_EDAD', label: 'Menor de edad', text: 'la cuenta parece ser de una persona menor de 18 años' };
const acoso = { code: 'ACOSO', label: 'Acoso', text: 'mensajes o contenido que hostigan o intimidan a otra persona' };
const pending = {
  code: 'ACCOUNT_SUSPENDED',
  detail: 'Tu cuenta está suspendida mientras revisamos un reporte.',
  details: { pendingReview: true, reason: minor },
};
const pendingNotice = accountSuspensionCopy.notice({ pendingReview: true, until: null, reason: minor });
const rights =
  'Mientras dure, no puedes usar la app. Para pedir tus datos, corregirlos, borrarlos o retirar un consentimiento, escribe a {{REPP_CONTACTO_PRIVACIDAD}}.';

test('a 401 ACCOUNT_SUSPENDED is recognised by its code, and says its reason and rights', () => {
  assert.equal(
    suspensionMessage(401, pending),
    `Tu cuenta está suspendida mientras revisamos una denuncia. Motivo: Menor de edad (la cuenta parece ser de una persona menor de 18 años). Te avisamos por correo cuando terminemos. ${rights}`,
  );
  const dated = suspensionMessage(401, {
    code: 'ACCOUNT_SUSPENDED',
    details: { pendingReview: false, until: '2026-12-01T12:00:00.000Z', reason: acoso },
  });
  assert.equal(
    dated,
    `Tu cuenta está suspendida hasta el 1 de diciembre de 2026. Motivo: Acoso (mensajes o contenido que hostigan o intimidan a otra persona). ${rights}`,
  );
});

test('login says a suspension or an expulsion by its code, and falls back otherwise', () => {
  const fallback = () => 'Correo o contraseña incorrectos.';
  assert.equal(loginFailureMessage({ status: 403, ...pending }, fallback), pendingNotice);
  assert.equal(
    loginFailureMessage({ status: 403, code: 'ACCOUNT_BANNED', details: { reason: acoso } }, fallback),
    'Tu cuenta fue expulsada por incumplir varias veces las normas de la comunidad. Motivo: Acoso (mensajes o contenido que hostigan o intimidan a otra persona). Para tus datos, escribe a {{REPP_CONTACTO_PRIVACIDAD}}.',
  );
  assert.equal(loginFailureMessage({ status: 401, code: 'UNAUTHORIZED' }, fallback), fallback());
});

test('any other 401 keeps the usual «Sesión expirada», whatever its text says', () => {
  assert.equal(suspensionMessage(401, { detail: 'Tu cuenta está suspendida.' }), null);
  assert.equal(suspensionMessage(401, { code: 'TOKEN_EXPIRED' }), null);
  assert.equal(suspensionMessage(401, null), null);
  assert.equal(suspensionMessage(500, pending), null);
});

function recorder(overrides: Partial<SuspendedSessionSteps> = {}) {
  const calls: string[] = [];
  const steps: SuspendedSessionSteps = {
    getRefreshToken: async () => { calls.push('read'); return 'refresh'; },
    revokeRefreshToken: async (token) => { calls.push(`revoke:${token}`); },
    clearTokens: async () => { calls.push('clear'); },
    sessionLost: () => { calls.push('lost'); },
    notify: (message) => { calls.push(`notify:${message}`); },
    ...overrides,
  };
  return { calls, steps };
}

test('clears the tokens before anything can renew them, then ends the session with the sentence', async () => {
  const { calls, steps } = recorder();
  await endSuspendedSession(steps, 'Suspendida.');
  assert.deepEqual(calls, ['read', 'clear', 'revoke:refresh', 'lost', 'notify:Suspendida.']);
});

test('a burst of parallel 401s ends the session once', async () => {
  const { calls, steps } = recorder();
  await Promise.all([endSuspendedSession(steps, 'x'), endSuspendedSession(steps, 'x'), endSuspendedSession(steps, 'x')]);
  assert.equal(calls.filter((call) => call === 'lost').length, 1);
  assert.equal(calls.filter((call) => call.startsWith('notify')).length, 1);
});

test('a failing Keychain or revocation never keeps the session open', async () => {
  const { calls, steps } = recorder({
    getRefreshToken: async () => { throw new Error('keychain'); },
    clearTokens: async () => { throw new Error('keychain'); },
  });
  await endSuspendedSession(steps, 'x');
  assert.deepEqual(calls, ['lost', 'notify:x']);
  const second = recorder({ revokeRefreshToken: async () => { throw new Error('sin red'); } });
  await endSuspendedSession(second.steps, 'x');
  assert.deepEqual(second.calls, ['read', 'clear', 'lost', 'notify:x']);
});

test('wired like the mobile client: a 401 ACCOUNT_SUSPENDED never renews, never retries, ends the session once', async () => {
  const { createApiClient } = await import('@gymsheet/api-client');
  const tokens: { access: string | null; refresh: string | null } = { access: 'a', refresh: 'r' };
  const events: string[] = [];
  let requests = 0;
  const suspended = () =>
    new Response(JSON.stringify({ status: 401, ...pending }), {
      status: 401,
      headers: { 'content-type': 'application/problem+json' },
    });
  const fetchImpl: typeof fetch = async () => {
    requests += 1;
    const response = suspended();
    const message = suspensionMessage(401, await response.clone().json());
    if (message) {
      await endSuspendedSession({
        getRefreshToken: async () => tokens.refresh,
        revokeRefreshToken: async () => { events.push('revoke'); },
        clearTokens: async () => { tokens.access = null; tokens.refresh = null; },
        sessionLost: () => events.push('lost'),
        notify: (text) => events.push(`notify:${text}`),
      }, message);
    }
    return response;
  };
  const client = createApiClient({
    baseUrl: 'https://api.test',
    fetchImpl,
    tokenProvider: {
      getAccessToken: async () => tokens.access,
      setAccessToken: async (token) => { tokens.access = token; },
      clear: async () => { tokens.access = null; },
    },
    // Same rule as `refreshSession` in `api/client.ts`: no refresh token, no renewal.
    refreshSession: async () => {
      events.push('refresh');
      return tokens.refresh !== null;
    },
    onUnauthorized: async () => { events.push('unauthorized'); },
  });
  const { z } = await import('zod');
  await assert.rejects(client.request('/me', z.unknown()), { status: 401 });
  assert.equal(requests, 1);
  assert.deepEqual(tokens, { access: null, refresh: null });
  assert.deepEqual(events.filter((event) => event !== 'refresh' && event !== 'unauthorized'), [
    'revoke',
    'lost',
    `notify:${pendingNotice}`,
  ]);
});
