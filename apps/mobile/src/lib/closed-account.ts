/**
 * What this phone forgets once the server has closed the account, as pure
 * orchestration (no React Native: runs under `node --test`).
 *
 * Unlike `endSession` nothing is sent to the server: the closure already
 * revoked every session and device there, so a push unregister or a refresh
 * revocation could only fail. Every step runs even if an earlier one throws:
 * a Keychain error must never leave the quick-login token or the cached data
 * of a closed account behind. The session flips to signed out before the
 * caches are dropped, so no screen refetches into the void meanwhile.
 */
export type ClosedAccountSteps = {
  clearTokens: () => Promise<void>;
  /** Turns quick login off and drops any parked refresh token. */
  disableQuickLogin: () => Promise<void>;
  /** Flips the store to signed out and routes to the goodbye screen. */
  signOut: () => void;
  /** Query cache, disk caches, per-account memories. */
  clearCaches: readonly (() => Promise<void> | void)[];
};

async function attempt(step: () => Promise<void> | void, failures: unknown[]): Promise<void> {
  try {
    await step();
  } catch (error) {
    failures.push(error);
  }
}

/** Runs every step; resolves with the failures (for telemetry), never rejects. */
export async function wipeClosedAccount(steps: ClosedAccountSteps): Promise<unknown[]> {
  const failures: unknown[] = [];
  await attempt(steps.clearTokens, failures);
  await attempt(steps.disableQuickLogin, failures);
  await attempt(steps.signOut, failures);
  for (const clear of steps.clearCaches) await attempt(clear, failures);
  return failures;
}
