/**
 * Device headers sent with every request (`X-Installation-Id`, `X-App-Version`,
 * `X-OS-Version`, `X-Device-Model`). Pure: no React Native import, so it runs
 * under `node --test`. The backend treats them as telemetry and ignores invalid
 * values; we drop them here first so a header never makes a request fail.
 */

export type DeviceInfo = {
  installationId: string | null;
  appVersion: string | null;
  osVersion: string | null;
  deviceModel: string | null;
};

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
// ASCII subset of the backend's label rule: a non-Latin-1 character can make
// `Headers.set` throw in some fetch polyfills, and losing a label is harmless.
const LABEL = /^[A-Za-z0-9 ._+\-(),/]+$/u;

function label(raw: string | number | null | undefined, maxLength: number): string | null {
  if (raw === null || raw === undefined) return null;
  const value = String(raw).trim();
  if (!value || value.length > maxLength || !LABEL.test(value)) return null;
  return value;
}

export function isInstallationId(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_V4.test(value);
}

/** Only the headers with a usable value; bounds mirror the backend (40/40/80). */
export function buildDeviceHeaders(info: DeviceInfo): Record<string, string> {
  const headers: Record<string, string> = {};
  if (isInstallationId(info.installationId)) headers['X-Installation-Id'] = info.installationId;
  const appVersion = label(info.appVersion, 40);
  if (appVersion) headers['X-App-Version'] = appVersion;
  const osVersion = label(info.osVersion, 40);
  if (osVersion) headers['X-OS-Version'] = osVersion;
  const deviceModel = label(info.deviceModel, 80);
  if (deviceModel) headers['X-Device-Model'] = deviceModel;
  return headers;
}

/** Where random bytes can come from, strongest first. Injected for tests. */
export type RandomSources = {
  randomUUID?: () => string;
  getRandomValues?: (bytes: Uint8Array) => Uint8Array;
  /** `globalThis.expo.uuidv4`: expo-modules-core's native generator (SecureRandom / NSUUID). */
  nativeUuidv4?: () => string;
};

function formatV4(bytes: Uint8Array): string {
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * A random UUID v4, generated once per install. Never derived from hardware.
 *
 * Hermes ships no Web Crypto, and `expo-crypto` is not installed, so the order is:
 * 1. `crypto.randomUUID` / `crypto.getRandomValues` when a runtime provides them;
 * 2. the native UUID generator every Expo app already carries
 *    (`globalThis.expo.uuidv4`, backed by `UUID.randomUUID()` / `NSUUID`);
 * 3. `Math.random` as a last resort. Acceptable only because the id is a
 *    correlation handle, not a secret: the server never authorizes with it.
 */
export function generateInstallationId(sources: RandomSources): string {
  for (const candidate of [sources.randomUUID, sources.nativeUuidv4]) {
    try {
      const value = candidate?.().toLowerCase();
      if (isInstallationId(value)) return value;
    } catch {
      // Try the next source.
    }
  }
  const bytes = new Uint8Array(16);
  try {
    if (sources.getRandomValues) return formatV4(sources.getRandomValues(bytes));
  } catch {
    // Fall through to the weak generator.
  }
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return formatV4(bytes);
}

/** The sources this runtime offers, read from `globalThis` at call time. */
export function runtimeRandomSources(): RandomSources {
  const scope = globalThis as {
    crypto?: { randomUUID?: () => string; getRandomValues?: (bytes: Uint8Array) => Uint8Array };
    expo?: { uuidv4?: () => string };
  };
  const cryptoApi = scope.crypto;
  return {
    randomUUID: cryptoApi?.randomUUID ? () => cryptoApi.randomUUID!() : undefined,
    getRandomValues: cryptoApi?.getRandomValues ? (bytes) => cryptoApi.getRandomValues!(bytes) : undefined,
    nativeUuidv4: scope.expo?.uuidv4 ? () => scope.expo!.uuidv4!() : undefined,
  };
}
