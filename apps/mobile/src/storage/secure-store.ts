import * as SecureStore from 'expo-secure-store';
import type { AuthStorage } from '@gymsheet/auth';
import type { TokenProvider } from '@gymsheet/api-client';

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
    // Con los tokens se va también la copia del principal: sin ella, un
    // arranque posterior no puede dar por abierta una sesión que ya no existe.
    await SecureStore.deleteItemAsync(PRINCIPAL_KEY);
  },
};

/**
 * Copia local de quién es la sesión (id, correo, rol, gimnasio).
 *
 * Existe para arrancar sin red: antes el arranque esperaba a `GET /auth/me` y,
 * si fallaba por lo que fuera —sin cobertura, el plazo de 15 s, un 5xx—,
 * borraba los tokens. Quien abría la app en el sótano del gimnasio quedaba
 * fuera. Se guarda como texto y quien lo lee lo valida con el esquema.
 */
export const principalCache = {
  async read(): Promise<unknown> {
    const raw = await SecureStore.getItemAsync(PRINCIPAL_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  },
  async write(principal: unknown): Promise<void> {
    await SecureStore.setItemAsync(PRINCIPAL_KEY, JSON.stringify(principal));
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
