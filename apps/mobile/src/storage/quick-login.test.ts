/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  consumeParkedToken,
  disableQuickLogin,
  enableQuickLogin,
  hasParkedToken,
  migrateLegacyCredentials,
  parkRefreshToken,
  quickLoginKeys,
  type QuickLoginStore,
} from './quick-login.ts';

type Entry = { value: string; protected: boolean };

/** In-memory Keychain that records which reads and writes asked for biometrics. */
function memoryStore(seed: Record<string, string> = {}, failures: { protectedRead?: boolean; protectedWrite?: boolean } = {}) {
  const entries = new Map<string, Entry>(Object.entries(seed).map(([key, value]) => [key, { value, protected: false }]));
  const log: string[] = [];
  const store: QuickLoginStore = {
    async get(key, protectedRead) {
      log.push(`get:${key}${protectedRead ? ':auth' : ''}`);
      if (protectedRead && failures.protectedRead) throw new Error('cancelled');
      return entries.get(key)?.value ?? null;
    },
    async set(key, value, protectedWrite) {
      log.push(`set:${key}${protectedWrite ? ':auth' : ''}`);
      if (protectedWrite && failures.protectedWrite) throw new Error('cancelled');
      entries.set(key, { value, protected: Boolean(protectedWrite) });
    },
    async remove(key) {
      log.push(`remove:${key}`);
      entries.delete(key);
    },
  };
  return { store, entries, log };
}

const LEGACY = JSON.stringify({ email: 'ana@example.com', password: 'Secreta2026!' });

test('la migración borra la contraseña guardada y vuelve a ofrecer el acceso rápido', async () => {
  const { store, entries } = memoryStore({ [quickLoginKeys.legacyCredentials]: LEGACY, [quickLoginKeys.offered]: '1' });
  await migrateLegacyCredentials(store);
  assert.equal(entries.has(quickLoginKeys.legacyCredentials), false);
  assert.equal(entries.has(quickLoginKeys.offered), false);
  assert.equal(entries.get(quickLoginKeys.migrated)?.value, '1');
});

test('la migración corre una sola vez y nunca lee el hueco protegido', async () => {
  const { store, log } = memoryStore({ [quickLoginKeys.migrated]: '1', [quickLoginKeys.offered]: '1' });
  await migrateLegacyCredentials(store);
  assert.deepEqual(log, [`get:${quickLoginKeys.migrated}`]);
});

test('ningún valor guardado contiene la contraseña', async () => {
  const { store, entries } = memoryStore({ [quickLoginKeys.legacyCredentials]: LEGACY });
  await migrateLegacyCredentials(store);
  await enableQuickLogin(store);
  await parkRefreshToken(store, 'refresh-abc');
  for (const entry of entries.values()) assert.ok(!entry.value.includes('Secreta2026!'));
});

test('sin activar, cerrar sesión no aparca nada y el llamador revoca', async () => {
  const { store, entries } = memoryStore();
  assert.equal(await parkRefreshToken(store, 'refresh-abc'), false);
  assert.equal(entries.has(quickLoginKeys.token), false);
});

test('activado, aparca el refresh detrás de la biometría', async () => {
  const { store, entries } = memoryStore();
  await enableQuickLogin(store);
  assert.equal(await parkRefreshToken(store, 'refresh-abc'), true);
  assert.deepEqual(entries.get(quickLoginKeys.token), { value: 'refresh-abc', protected: true });
  assert.equal(await hasParkedToken(store), true);
});

test('si la persona cancela la huella al aparcar, se revoca como siempre', async () => {
  const { store, entries } = memoryStore({}, { protectedWrite: true });
  await enableQuickLogin(store);
  assert.equal(await parkRefreshToken(store, 'refresh-abc'), false);
  assert.equal(entries.has(quickLoginKeys.armed), false);
});

test('entrar canjea el token aparcado y vacía el hueco', async () => {
  const { store, entries, log } = memoryStore();
  await enableQuickLogin(store);
  await parkRefreshToken(store, 'refresh-abc');
  const seen: string[] = [];
  const outcome = await consumeParkedToken(store, async (token) => {
    seen.push(token);
    return 'session';
  });
  assert.deepEqual(outcome, { kind: 'signed-in', value: 'session' });
  assert.deepEqual(seen, ['refresh-abc']);
  assert.ok(log.includes(`get:${quickLoginKeys.token}:auth`));
  assert.equal(entries.has(quickLoginKeys.token), false);
  assert.equal(await hasParkedToken(store), false);
  // The preference survives: the next logout parks again.
  assert.equal(entries.get(quickLoginKeys.enabled)?.value, '1');
});

test('un token rechazado se borra y pide contraseña', async () => {
  const { store } = memoryStore();
  await enableQuickLogin(store);
  await parkRefreshToken(store, 'refresh-abc');
  assert.deepEqual(await consumeParkedToken(store, async () => 'rejected' as const), { kind: 'rejected' });
  assert.equal(await hasParkedToken(store), false);
});

test('sin red el token se conserva para reintentar', async () => {
  const { store } = memoryStore();
  await enableQuickLogin(store);
  await parkRefreshToken(store, 'refresh-abc');
  await assert.rejects(consumeParkedToken(store, async () => {
    throw new Error('offline');
  }));
  assert.equal(await hasParkedToken(store), true);
});

test('cancelar la biometría al entrar no borra nada ni llama al servidor', async () => {
  const seed = { [quickLoginKeys.armed]: '1', [quickLoginKeys.token]: 'refresh-abc' };
  const { store, entries } = memoryStore(seed, { protectedRead: true });
  let called = false;
  const outcome = await consumeParkedToken(store, async () => {
    called = true;
    return 'session';
  });
  assert.deepEqual(outcome, { kind: 'cancelled' });
  assert.equal(called, false);
  assert.equal(entries.get(quickLoginKeys.token)?.value, 'refresh-abc');
});

test('sin token aparcado no se pide biometría', async () => {
  const { store, log } = memoryStore();
  assert.deepEqual(await consumeParkedToken(store, async () => 'session'), { kind: 'none' });
  assert.ok(!log.some((line) => line.endsWith(':auth')));
});

test('desactivar borra la preferencia y el token aparcado', async () => {
  const { store, entries } = memoryStore();
  await enableQuickLogin(store);
  await parkRefreshToken(store, 'refresh-abc');
  await disableQuickLogin(store);
  assert.equal(entries.size, 0);
});
