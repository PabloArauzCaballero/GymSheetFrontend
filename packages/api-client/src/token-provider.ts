/**
 * Abstraction for supplying the bearer token to the API client.
 *
 * The client never touches platform storage directly. On mobile this is
 * backed by Expo SecureStore; on web the browser continues to rely on the
 * BFF HttpOnly cookie, so a no-op provider is enough there.
 */
export interface TokenProvider {
  getAccessToken(): Promise<string | null>;
  setAccessToken(token: string): Promise<void>;
  clear(): Promise<void>;
}

/** Token provider used by cookie-based clients that never attach a bearer token. */
export const noopTokenProvider: TokenProvider = {
  async getAccessToken() {
    return null;
  },
  async setAccessToken() {},
  async clear() {},
};
