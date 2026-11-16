import { IDENTITY_EMAIL_UNVERIFIED, SIGNUP_TOKEN_INVALID, type UserDevice } from '@gymsheet/schemas';
import { accountSuspensionCopy, accountSuspensionOf } from './account-rights';

/** Copy and pure rules of email verification, devices and third-party sign-in, shared by web and mobile. */

export const emailVerificationCopy = {
  title: 'Verifica tu correo',
  description: 'Te enviamos un código de 6 dígitos. Escríbelo para usar Conocer, el chat y el resto de lo social.',
  pinLabel: 'Código de verificación',
  submit: 'Verificar',
  resend: 'Reenviar código',
  resendIn: (seconds: number) => `Reenviar en ${seconds} s`,
  verified: 'Listo, tu correo está verificado.',
  banner: 'Verifica tu correo para usar Conocer, el chat y lo social.',
  bannerAction: 'Verificar ahora',
  errors: {
    EMAIL_PIN_INVALID: 'El código no es correcto.',
    EMAIL_PIN_EXPIRED: 'El código venció. Pide uno nuevo.',
    EMAIL_PIN_EXHAUSTED: 'Demasiados intentos. Pide un código nuevo.',
    EMAIL_PIN_COOLDOWN: 'Espera un momento antes de pedir otro código.',
  },
} as const;

export const deviceCopy = {
  title: 'Dispositivos',
  description: 'Dónde está abierta tu cuenta. Si no reconoces uno, ciérralo.',
  current: 'Este dispositivo',
  revoke: 'Cerrar sesión',
  revokeOthers: 'Cerrar sesión en los demás',
  revokeOthersConfirm: 'Se cerrará tu sesión en todos los demás dispositivos.',
  lastSeen: (when: string) => `Última actividad: ${when}`,
} as const;

export const identitySignInCopy = {
  google: 'Continuar con Google',
  apple: 'Continuar con Apple',
  separator: 'o',
  completeTitle: 'Completa tu cuenta',
  completeDescription: 'Solo faltan unos datos para crear tu cuenta.',
} as const;

const platformLabels: Record<UserDevice['platform'], string> = {
  WEB: 'Navegador',
  IOS: 'iPhone o iPad',
  ANDROID: 'Android',
  UNKNOWN: 'Dispositivo',
};

/** «Pixel 8 · Android 15» or the platform alone when the model is unknown. */
export function deviceLabel(device: Pick<UserDevice, 'platform' | 'deviceModel' | 'osVersion'>): string {
  const platform = platformLabels[device.platform];
  if (!device.deviceModel) return device.osVersion ? `${platform} ${device.osVersion}` : platform;
  return device.osVersion ? `${device.deviceModel} · ${platform} ${device.osVersion}` : `${device.deviceModel} · ${platform}`;
}

/** Seconds to wait before asking for another PIN, from a 429 EMAIL_PIN_COOLDOWN `details`. */
export function pinCooldownSeconds(details: unknown): number | null {
  const value = (details as { retryAfterSeconds?: unknown } | null | undefined)?.retryAfterSeconds;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.ceil(value) : null;
}

/** `SIGNUP_REJECTED`: deliberately generic — never says which check refused the signup. */
export const signupRejectedMessage = 'No pudimos crear tu cuenta. Inténtalo de nuevo.';

/** What a failed Google or Apple attempt tells the person. Never the backend internals. */
export function identityErrorMessage(provider: 'Google' | 'Apple', error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: unknown; status?: unknown };
  const suspension = accountSuspensionOf(error);
  if (suspension) return accountSuspensionCopy.message(suspension);
  if (code === IDENTITY_EMAIL_UNVERIFIED) return `Tu cuenta de ${provider} no tiene el correo verificado.`;
  if (code === SIGNUP_TOKEN_INVALID) return `Pasó demasiado tiempo. Vuelve a continuar con ${provider}.`;
  if (status === 404) return `El acceso con ${provider} no está disponible.`;
  if (status === 409) return 'Ya existe una cuenta con ese correo. Inicia sesión con tu contraseña.';
  if (status === 401) return `No pudimos validar tu cuenta de ${provider}. Inténtalo de nuevo.`;
  return `No pudimos continuar con ${provider}. Inténtalo de nuevo.`;
}
