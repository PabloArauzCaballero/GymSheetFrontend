import { z } from 'zod';
import { ApiError, createApiClient } from '@gymsheet/api-client';
import { createSessionRefresher } from '@gymsheet/auth';
import { env } from '@/config/env';
import { notify } from '@/notifications';
import { secureStoreAuthStorage, secureStoreTokenProvider } from '@/storage/secure-store';

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

const tokenPairSchema = z.object({ accessToken: z.string(), refreshToken: z.string() });

/**
 * Bare client for `POST /auth/refresh`: no bearer and no renewal on 401, so
 * renewing can never recurse into itself.
 */
const refreshClient = createApiClient({ baseUrl: env.apiUrl });

/**
 * The one place the session is renewed. Shared by the 401 path below and by
 * the renewal on resume (`session-keep-alive`): the backend revokes the whole
 * session when a refresh token is used twice, so both must go through here.
 */
export const sessionRefresher = createSessionRefresher({
  storage: secureStoreAuthStorage,
  exchange: (refreshToken) =>
    refreshClient.request('/auth/refresh', tokenPairSchema, {
      method: 'POST',
      body: { refreshToken },
    }),
  // Only the server's verdict ends the session; no signal or a 5xx keeps it.
  isRejection: (error) =>
    error instanceof ApiError && [400, 401, 403].includes(error.status),
});

/**
 * The mobile client talks to the NestJS backend directly with a bearer token
 * (from SecureStore), unlike the web client which proxies through the BFF cookie.
 * Both share the same request/response contract via @gymsheet/api-client.
 */
export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  tokenProvider: secureStoreTokenProvider,
  // A 401 first tries to renew (15-minute access token, 90-day session) and
  // repeats the request; only a rejected renewal reaches `onUnauthorized`.
  refreshSession: () => sessionRefresher.refresh(),
  onUnauthorized: async () => {
    // A 401 on the login request itself is a bad password, not a dropped
    // session: without a stored token there was no session to expire, and the
    // login screen already reports the failure. Only warn when one is lost.
    const hadSession =
      (await secureStoreTokenProvider.getAccessToken()) !== null ||
      (await secureStoreAuthStorage.getRefreshToken()) !== null;
    await secureStoreAuthStorage.clearTokens();
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
