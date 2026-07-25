import * as SecureStore from 'expo-secure-store';
import type { AuthStorage } from '@gymsheet/auth';
import type { TokenProvider } from '@gymsheet/api-client';

const ACCESS_KEY = 'gymsheet.accessToken';
const REFRESH_KEY = 'gymsheet.refreshToken';

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
