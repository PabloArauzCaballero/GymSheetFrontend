import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CREDENTIALS_KEY = 'gymsheet.biometricCredentials';
const PROMPTED_KEY = 'gymsheet.biometricPrompted';

export type BiometricKind = 'face' | 'fingerprint' | 'generic';

export interface BiometricCredentials {
  email: string;
  password: string;
}

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

/**
 * La credencial queda en el Llavero/Keystore protegida con
 * `requireAuthentication`: el propio sistema pide rostro o huella al leerla, así
 * que no hay forma de sacarla sin pasar por ahí. Si la persona cambia sus datos
 * biométricos el sistema invalida la clave y la lectura falla: se pide la
 * contraseña de nuevo, que es lo correcto.
 */
export async function saveBiometricCredentials(credentials: BiometricCredentials): Promise<void> {
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials), {
    requireAuthentication: true,
    authenticationPrompt: 'Confirma para activar el acceso rápido',
  });
}

export async function hasBiometricCredentials(): Promise<boolean> {
  try {
    // No exige autenticación: sólo mira si hay algo guardado.
    const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY, { requireAuthentication: false });
    return stored !== null;
  } catch {
    // En algunas versiones leer sin autenticar lanza; entonces existe.
    return true;
  }
}

/** Pide rostro/huella y devuelve la credencial, o `null` si se cancela o falla. */
export async function readBiometricCredentials(): Promise<BiometricCredentials | null> {
  try {
    const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY, {
      requireAuthentication: true,
      authenticationPrompt: 'Entra a REPP',
    });
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BiometricCredentials>;
    return typeof parsed.email === 'string' && typeof parsed.password === 'string'
      ? { email: parsed.email, password: parsed.password }
      : null;
  } catch {
    return null;
  }
}

export async function clearBiometricCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  } catch {
    // Nada que borrar.
  }
}

export async function wasBiometricOffered(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(PROMPTED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markBiometricOffered(): Promise<void> {
  try {
    await SecureStore.setItemAsync(PROMPTED_KEY, '1');
  } catch {
    // Sólo evita repetir la pregunta.
  }
}
