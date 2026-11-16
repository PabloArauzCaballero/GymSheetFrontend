/**
 * Quick login with Face ID / fingerprint, as pure logic over an injected store
 * (no React Native import: it runs under `node --test`).
 *
 * F3.17: the old version kept the email and the **password** in the Keychain.
 * Now the protected slot holds a refresh token, never a password:
 *
 * - While a session is open the slot is empty. The live refresh token rotates
 *   on every renewal, and the server revokes the whole family when a rotated
 *   token is replayed, so a copy parked in the slot would go stale and, once
 *   used, kill the session. Rewriting the slot on each rotation is not an
 *   option either: on Android every protected write asks for the fingerprint.
 * - On logout, if the person turned quick login on, the current refresh token
 *   is parked in the slot (behind `requireAuthentication`) instead of being
 *   revoked. One prompt on Android, none on iOS.
 * - On the login screen the slot is read (biometric prompt), exchanged at
 *   `POST /auth/refresh`, and emptied: that token is spent either way.
 *
 * The token stays revocable from «Dispositivos», expires with the server's
 * refresh lifetime and is bound to this installation; a password was none of that.
 */

export type ProtectedRead = { prompt: string };
export type ProtectedWrite = { prompt: string };

export type QuickLoginStore = {
  get: (key: string, protectedRead?: ProtectedRead) => Promise<string | null>;
  set: (key: string, value: string, protectedWrite?: ProtectedWrite) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

export const quickLoginKeys = {
  /** Pre-F3.17 slot with `{ email, password }`. Only ever deleted now. */
  legacyCredentials: 'gymsheet.biometricCredentials',
  /** «We already asked»: reset by the migration so the new mode is offered once. */
  offered: 'gymsheet.biometricPrompted',
  migrated: 'gymsheet.quickLogin.migratedV2',
  enabled: 'gymsheet.quickLogin.enabled',
  /** Plain marker of a parked token, so checking for it never triggers Face ID. */
  armed: 'gymsheet.quickLogin.armed',
  token: 'gymsheet.quickLogin.refreshToken',
} as const;

export const quickLoginPrompts = {
  arm: 'Confirma para mantener el acceso rápido',
  read: 'Entra a REPP',
} as const;

/**
 * First launch after the update: delete any stored password. Idempotent; the
 * marker is written last so an interrupted run repeats on the next launch.
 */
export async function migrateLegacyCredentials(store: QuickLoginStore): Promise<void> {
  if ((await store.get(quickLoginKeys.migrated)) === '1') return;
  await store.remove(quickLoginKeys.legacyCredentials);
  // Whoever had the old mode is offered the new one on the next password login.
  await store.remove(quickLoginKeys.offered);
  await store.set(quickLoginKeys.migrated, '1');
}

export async function enableQuickLogin(store: QuickLoginStore): Promise<void> {
  await store.set(quickLoginKeys.enabled, '1');
}

export async function isQuickLoginEnabled(store: QuickLoginStore): Promise<boolean> {
  return (await store.get(quickLoginKeys.enabled)) === '1';
}

export async function hasParkedToken(store: QuickLoginStore): Promise<boolean> {
  return (await store.get(quickLoginKeys.armed)) === '1';
}

export async function clearParkedToken(store: QuickLoginStore): Promise<void> {
  await store.remove(quickLoginKeys.armed);
  await store.remove(quickLoginKeys.token);
}

export async function disableQuickLogin(store: QuickLoginStore): Promise<void> {
  await store.remove(quickLoginKeys.enabled);
  await clearParkedToken(store);
}

/**
 * Parks the refresh token at logout. `true` means it is stored and the caller
 * must NOT revoke it; `false` (off, cancelled, no biometrics) means revoke as usual.
 */
export async function parkRefreshToken(store: QuickLoginStore, refreshToken: string): Promise<boolean> {
  if (!refreshToken || !(await isQuickLoginEnabled(store))) return false;
  try {
    await store.set(quickLoginKeys.token, refreshToken, { prompt: quickLoginPrompts.arm });
    await store.set(quickLoginKeys.armed, '1');
    return true;
  } catch {
    await clearParkedToken(store).catch(() => undefined);
    return false;
  }
}

export type QuickLoginOutcome<T> =
  | { kind: 'none' }
  | { kind: 'cancelled' }
  | { kind: 'rejected' }
  | { kind: 'signed-in'; value: T };

/**
 * Reads the parked token (biometric prompt) and hands it to `exchange`, which
 * returns `'rejected'` when the server refuses it. A thrown error (no network,
 * 5xx) leaves the slot as it was so the next attempt can retry.
 */
export async function consumeParkedToken<T>(
  store: QuickLoginStore,
  exchange: (refreshToken: string) => Promise<T | 'rejected'>,
): Promise<QuickLoginOutcome<T>> {
  if (!(await hasParkedToken(store))) return { kind: 'none' };
  let token: string | null;
  try {
    token = await store.get(quickLoginKeys.token, { prompt: quickLoginPrompts.read });
  } catch {
    // Cancelled, or the biometric set changed and the OS invalidated the key.
    return { kind: 'cancelled' };
  }
  if (!token) {
    await clearParkedToken(store);
    return { kind: 'none' };
  }
  const result = await exchange(token);
  // Spent either way: rotated on success, dead on rejection.
  await clearParkedToken(store);
  return result === 'rejected' ? { kind: 'rejected' } : { kind: 'signed-in', value: result };
}
