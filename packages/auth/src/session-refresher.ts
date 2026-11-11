import type { AuthStorage } from './storage';

/** Result of trying to renew the session with the stored refresh token. */
export type RefreshOutcome =
  /** A new pair was stored. */
  | 'refreshed'
  /** The server said the session is over (or there was nothing to renew). Tokens were cleared. */
  | 'rejected'
  /** Could not ask (no network, timeout, 5xx). The session is kept for a later try. */
  | 'unavailable';

export type TokenPair = { accessToken: string; refreshToken: string };

export type SessionRefresherConfig = {
  storage: AuthStorage;
  /** Calls `POST /auth/refresh`. Must not go through a client that refreshes on 401. */
  exchange: (refreshToken: string) => Promise<TokenPair>;
  /** True when [error] is the server rejecting the refresh token (400/401/403). */
  isRejection: (error: unknown) => boolean;
};

export type SessionRefresher = { refresh(): Promise<RefreshOutcome> };

/**
 * Renews the session ONE exchange at a time.
 *
 * The backend rotates the refresh token on every use and treats a second use
 * of the same token as theft, revoking the whole session. A burst of parallel
 * 401s, or a 401 arriving while the app renews on resume, would otherwise
 * spend the same token twice and log the user out. Concurrent callers share
 * the exchange in flight and get the same outcome.
 */
export function createSessionRefresher(config: SessionRefresherConfig): SessionRefresher {
  let inFlight: Promise<RefreshOutcome> | null = null;

  async function run(): Promise<RefreshOutcome> {
    const refreshToken = await config.storage.getRefreshToken();
    if (!refreshToken) return 'rejected';
    let pair: TokenPair;
    try {
      pair = await config.exchange(refreshToken);
    } catch (error: unknown) {
      // Only the server can say the token is dead. Losing signal for a few
      // seconds must not log anyone out.
      if (config.isRejection(error)) {
        await config.storage.clearTokens();
        return 'rejected';
      }
      return 'unavailable';
    }
    await config.storage.saveTokens(pair.accessToken, pair.refreshToken);
    return 'refreshed';
  }

  return {
    refresh() {
      inFlight ??= run().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
  };
}

/**
 * Expiry (`exp`, epoch seconds) of a JWT access token, or null when it cannot
 * be read. Only used to schedule a renewal; the server still decides validity.
 */
export function accessTokenExpiry(accessToken: string): number | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const json = decodeBase64Url(payload);
    const exp: unknown = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Platform-free base64url decoding (React Native has no Buffer). ASCII payloads only. */
function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/gu, '+').replace(/_/gu, '/');
  let bits = 0;
  let value = 0;
  let output = '';
  for (const character of base64) {
    if (character === '=') break;
    const index = BASE64_ALPHABET.indexOf(character);
    if (index < 0) throw new Error('Invalid base64url');
    value = (value << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((value >> bits) & 0xff);
    }
  }
  return output;
}
