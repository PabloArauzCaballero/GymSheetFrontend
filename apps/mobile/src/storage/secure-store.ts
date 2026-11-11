import * as SecureStore from 'expo-secure-store';
import type { AuthStorage } from '@gymsheet/auth';
import type { TokenProvider } from '@gymsheet/api-client';
import { z } from 'zod';
import { sessionPrincipalSchema } from '@gymsheet/schemas';

type CachedPrincipal = z.infer<typeof sessionPrincipalSchema>;

const ACCESS_KEY = 'gymsheet.accessToken';
const REFRESH_KEY = 'gymsheet.refreshToken';
const PRINCIPAL_KEY = 'gymsheet.principal';

/**
 * Mobile implementation of the shared AuthStorage contract, backed by the OS
 * secure enclave (Keychain on iOS, Keystore on Android). Tokens never touch
 * AsyncStorage or any unencrypted store.
 */
export const secureStoreAuthStorage: AuthStorage = {
  async getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async saveTokens(accessToken, refreshToken) {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },
  async clearTokens() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

/** Bridges AuthStorage to the api-client TokenProvider (access token only). */
export const secureStoreTokenProvider: TokenProvider = {
  getAccessToken: () => secureStoreAuthStorage.getAccessToken(),
  async setAccessToken(token) {
    const refresh = (await secureStoreAuthStorage.getRefreshToken()) ?? '';
    await secureStoreAuthStorage.saveTokens(token, refresh);
  },
  clear: () => secureStoreAuthStorage.clearTokens(),
};

/**
 * Last known account (id, email, name, role, gym), so the app can open without
 * signal. Not a credential: the server still authorises every request.
 */
export const principalCache = {
  async save(principal: CachedPrincipal): Promise<void> {
    await SecureStore.setItemAsync(PRINCIPAL_KEY, JSON.stringify(principal));
  },
  async read(): Promise<CachedPrincipal | null> {
    try {
      const raw = await SecureStore.getItemAsync(PRINCIPAL_KEY);
      if (!raw) return null;
      const parsed = sessionPrincipalSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(PRINCIPAL_KEY);
  },
};
