import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

/** What the phone offers, named the way the phone names it. */
export type BiometricKind = {
  /** «Face ID», «Touch ID», «huella», «reconocimiento facial». */
  label: string;
  /** Ionicons glyph for the unlock button. */
  icon: 'scan-outline' | 'finger-print-outline';
};

/**
 * The enrolled biometric of this phone, or null when there is none (the
 * option is then explained instead of offered). iPhone distinguishes Face ID
 * from Touch ID; on Android the sensor nearly every phone has is the
 * fingerprint, and a camera face unlock is not offered (it is not a strong
 * biometric).
 */
export async function availableBiometric(): Promise<BiometricKind | null> {
  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hardware || !enrolled) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    if (Platform.OS === 'ios') {
      if (face) return { label: 'Face ID', icon: 'scan-outline' };
      if (finger) return { label: 'Touch ID', icon: 'finger-print-outline' };
      return null;
    }
    if (finger) return { label: 'huella', icon: 'finger-print-outline' };
    if (face) return { label: 'reconocimiento facial', icon: 'scan-outline' };
    return null;
  } catch {
    return null;
  }
}

export type BiometricResult = 'passed' | 'cancelled' | 'failed';

/**
 * Shows the system Face ID / fingerprint prompt. Biometric only: the fallback
 * is the GymSheet password, not the phone's passcode (anyone who knows the
 * phone's PIN would otherwise open the account).
 */
export async function verifyBiometric(promptMessage: string): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true,
      fallbackLabel: '',
      biometricsSecurityLevel: 'strong',
    });
    if (result.success) return 'passed';
    return ['user_cancel', 'system_cancel', 'app_cancel'].includes(result.error)
      ? 'cancelled'
      : 'failed';
  } catch {
    return 'failed';
  }
}
