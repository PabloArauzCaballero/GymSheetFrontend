import { AppState, type AppStateStatus } from 'react-native';
import { accessTokenExpiry } from '@gymsheet/auth';
import { sessionRefresher } from '@/api/client';
import { secureStoreAuthStorage } from '@/storage/secure-store';

/** Renew this long before the 15-minute access token expires. */
const LEAD_MS = 2 * 60_000;
/** Retry after a renewal that could not reach the server. */
const RETRY_MS = 60_000;

/**
 * Renews the session by itself while the app is in the foreground: shortly
 * before the access token expires, and right away on returning to the app if
 * it already expired. Each renewal also slides the 90-day window on the
 * server, so a member who trains every week never sees the login again.
 *
 * Returns a stop function. [onRejected] runs when the server ended the
 * session (the refresher already cleared the tokens).
 */
export function startSessionKeepAlive(onRejected: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedule = async () => {
    clear();
    if (stopped || AppState.currentState !== 'active') return;
    const token = await secureStoreAuthStorage.getAccessToken();
    const expiry = token ? accessTokenExpiry(token) : null;
    // No access token but a refresh token: renew now (e.g. after an offline start).
    const wait = expiry === null ? 0 : expiry * 1000 - LEAD_MS - Date.now();
    if (wait <= 0) {
      await renew();
    } else {
      timer = setTimeout(() => void renew(), wait);
    }
  };

  const renew = async () => {
    if (stopped) return;
    if (!(await secureStoreAuthStorage.getRefreshToken())) return;
    const outcome = await sessionRefresher.refresh();
    if (stopped) return;
    if (outcome === 'refreshed') {
      await schedule();
    } else if (outcome === 'unavailable') {
      clear();
      timer = setTimeout(() => void renew(), RETRY_MS);
    } else {
      onRejected();
    }
  };

  const onAppState = (state: AppStateStatus) => {
    // Background timers are not reliable (iOS freezes them): recompute on return.
    if (state === 'active') void schedule();
    else clear();
  };

  const subscription = AppState.addEventListener('change', onAppState);
  void schedule();

  return () => {
    stopped = true;
    clear();
    subscription.remove();
  };
}
