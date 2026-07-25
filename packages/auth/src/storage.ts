/**
 * Contract every platform implements to persist auth tokens.
 *
 * - Web: tokens live in an HttpOnly cookie managed by the BFF, so the web
 *   implementation is a no-op (`CookieAuthStorage`) — JavaScript never reads them.
 * - Mobile: `SecureStoreAuthStorage` backed by Expo SecureStore (Keychain / Keystore).
 *
 * Web Storage (localStorage / sessionStorage) is explicitly forbidden for tokens.
 */
export interface AuthStorage {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  saveTokens(accessToken: string, refreshToken: string): Promise<void>;
  clearTokens(): Promise<void>;
}

/** No-op storage for cookie-based (BFF) clients where JS must not see the token. */
export const cookieAuthStorage: AuthStorage = {
  async getAccessToken() {
    return null;
  },
  async getRefreshToken() {
    return null;
  },
  async saveTokens() {},
  async clearTokens() {},
};
