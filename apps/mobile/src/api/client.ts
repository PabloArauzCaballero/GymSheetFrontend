import { createApiClient } from '@gymsheet/api-client';
import { env } from '@/config/env';
import { notify } from '@/notifications';
import { secureStoreTokenProvider } from '@/storage/secure-store';

/**
 * Called when the backend rejects the stored token. The auth store registers
 * itself here at startup instead of being imported directly — the store already
 * imports this module, and importing it back would close the cycle.
 */
type SessionLostHandler = () => void;
let onSessionLost: SessionLostHandler | null = null;

export function setSessionLostHandler(handler: SessionLostHandler): void {
  onSessionLost = handler;
}

/**
 * The mobile client talks to the NestJS backend directly with a bearer token
 * (from SecureStore), unlike the web client which proxies through the BFF cookie.
 * Both share the same request/response contract via @gymsheet/api-client.
 */
export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  tokenProvider: secureStoreTokenProvider,
  onUnauthorized: async () => {
    // A 401 on the login request itself is a bad password, not a dropped
    // session: without a stored token there was no session to expire, and the
    // login screen already reports the failure. Only warn when one is lost.
    const hadSession = (await secureStoreTokenProvider.getAccessToken()) !== null;
    await secureStoreTokenProvider.clear();
    if (!hadSession) return;
    // Marking the session lost is what sends the user back to /login. Without
    // it the guards still believe the session is valid and every screen sits on
    // a "Sesión expirada" card with a retry that can never succeed.
    onSessionLost?.();
    // A dropped session is the one failure the user cannot diagnose from the
    // screen alone. Dedup keeps a burst of parallel 401s to a single toast.
    notify.warning({
      title: 'Sesión expirada',
      message: 'Inicia sesión nuevamente para continuar.',
      deduplicationKey: 'session-expired',
    });
  },
});
