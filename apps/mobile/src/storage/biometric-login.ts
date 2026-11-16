import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  clearParkedToken,
  consumeParkedToken,
  enableQuickLogin,
  hasParkedToken,
  migrateLegacyCredentials,
  parkRefreshToken,
  quickLoginKeys,
  type QuickLoginOutcome,
  type QuickLoginStore,
} from './quick-login';

/**
 * Expo binding of `quick-login.ts`. A protected entry uses
 * `requireAuthentication`: the OS asks for the face or fingerprint to read it
 * (and, on Android, to write it). If the biometric set changes the OS
 * invalidates the key and the read fails: the password is asked again.
 */
const store: QuickLoginStore = {
  get: (key, protectedRead) =>
    SecureStore.getItemAsync(
      key,
      protectedRead ? { requireAuthentication: true, authenticationPrompt: protectedRead.prompt } : undefined,
    ),
  set: (key, value, protectedWrite) =>
    SecureStore.setItemAsync(
      key,
      value,
      protectedWrite ? { requireAuthentication: true, authenticationPrompt: protectedWrite.prompt } : undefined,
    ),
  remove: (key) => SecureStore.deleteItemAsync(key),
};

export type BiometricKind = 'face' | 'fingerprint' | 'generic';

/** Face ID en iPhone, huella en Android; cualquier otra cosa, texto genérico. */
export async function biometricKind(): Promise<BiometricKind | null> {
  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hardware || !enrolled) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const { AuthenticationType } = LocalAuthentication;
    if (Platform.OS === 'ios') {
      return types.includes(AuthenticationType.FACIAL_RECOGNITION) ? 'face' : 'fingerprint';
    }
    return types.includes(AuthenticationType.FINGERPRINT) ? 'fingerprint' : 'generic';
  } catch {
    return null;
  }
}

export function biometricLabel(kind: BiometricKind): string {
  if (kind === 'face') return 'Face ID';
  if (kind === 'fingerprint') return Platform.OS === 'ios' ? 'Touch ID' : 'tu huella';
  return 'biometría';
}

/** Runs once per install after the update; never blocks the launch. */
export async function migrateBiometricLogin(): Promise<void> {
  await migrateLegacyCredentials(store).catch(() => undefined);
}

export async function turnOnQuickLogin(): Promise<void> {
  await enableQuickLogin(store).catch(() => undefined);
}

/** A token is parked and the login screen can offer (or launch) the biometric entry. */
export async function hasQuickLogin(): Promise<boolean> {
  return hasParkedToken(store).catch(() => false);
}

/**
 * Parks the refresh token at logout. Just after parking, the login screen must
 * not launch the prompt on its own: on Android the person has just confirmed
 * with the fingerprint, and a second prompt right away reads as a loop.
 */
let skipNextAutoPrompt = false;

export async function parkForQuickLogin(refreshToken: string): Promise<boolean> {
  const parked = await parkRefreshToken(store, refreshToken).catch(() => false);
  if (parked) skipNextAutoPrompt = true;
  return parked;
}

/** `true` once after a logout that parked a token; the caller skips the auto prompt. */
export function takeAutoPromptSkip(): boolean {
  const skip = skipNextAutoPrompt;
  skipNextAutoPrompt = false;
  return skip;
}

export function signInWithParkedToken<T>(
  exchange: (refreshToken: string) => Promise<T | 'rejected'>,
): Promise<QuickLoginOutcome<T>> {
  return consumeParkedToken(store, exchange);
}

export async function forgetParkedToken(): Promise<void> {
  await clearParkedToken(store).catch(() => undefined);
}

export async function wasBiometricOffered(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(quickLoginKeys.offered)) === '1';
  } catch {
    return false;
  }
}

export async function markBiometricOffered(): Promise<void> {
  try {
    await SecureStore.setItemAsync(quickLoginKeys.offered, '1');
  } catch {
    // Sólo evita repetir la pregunta.
  }
}
