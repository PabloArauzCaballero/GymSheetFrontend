import { createApiClient } from '@gymsheet/api-client';
import { env } from '@/config/env';
import { secureStoreTokenProvider } from '@/storage/secure-store';

/**
 * The mobile client talks to the NestJS backend directly with a bearer token
 * (from SecureStore), unlike the web client which proxies through the BFF cookie.
 * Both share the same request/response contract via @gymsheet/api-client.
 */
export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  tokenProvider: secureStoreTokenProvider,
  onUnauthorized: async () => {
    // Cleared here; the auth store observes and redirects to /login.
    await secureStoreTokenProvider.clear();
  },
});
