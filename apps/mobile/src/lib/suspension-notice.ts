import { accountSuspensionCopy, accountSuspensionOf } from '@gymsheet/domain';

/**
 * A session refused because the account is suspended (`code: ACCOUNT_SUSPENDED`,
 * 401 with a still-valid token). Pure: runs under `node --test`. Login and
 * signup already show their 403 message as is.
 */

/** The sentence for an ACCOUNT_SUSPENDED body; `null` for any other answer. */
export function suspensionMessage(status: number, body: unknown): string | null {
  if (status !== 401 && status !== 403) return null;
  const suspension = accountSuspensionOf(body);
  return suspension ? accountSuspensionCopy.message(suspension) : null;
}

export type SuspendedSessionSteps = {
  getRefreshToken: () => Promise<string | null>;
  /** Best effort: the refresh dies on the server too. */
  revokeRefreshToken: (refreshToken: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  /** Flips the store to signed out (back to login). */
  sessionLost: () => void;
  notify: (message: string) => void;
};

let ending: Promise<void> | null = null;

/**
 * Ends the session at the first 401 ACCOUNT_SUSPENDED. Renewing would only
 * rotate a refresh token the server refuses to honour on the next request, so
 * the tokens are cleared BEFORE the shared client looks for a refresh: it finds
 * none, skips the renewal and does not retry. A burst of parallel 401s ends the
 * session (and shows the sentence) once.
 */
export function endSuspendedSession(steps: SuspendedSessionSteps, message: string): Promise<void> {
  ending ??= (async () => {
    let refreshToken: string | null = null;
    try {
      refreshToken = await steps.getRefreshToken();
    } catch {
      // Without it there is nothing to revoke; the local session still ends.
    }
    await steps.clearTokens().catch(() => undefined);
    if (refreshToken) void steps.revokeRefreshToken(refreshToken).catch(() => undefined);
    steps.sessionLost();
    steps.notify(message);
  })().finally(() => {
    ending = null;
  });
  return ending;
}
