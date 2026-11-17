import type { MyVerification, VerificationChallenge } from '@gymsheet/schemas';

/**
 * Pure rules of the mobile verification flow (no React Native: runs under
 * `node --test`). Copy and shared rules come from `@gymsheet/domain`.
 */

export type LocalSelfie = { uri: string; name: string; mimeType: string };
/** The fields of an `expo-image-picker` asset this flow reads. */
export type PickedAsset = { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number | null };

const SELFIE_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);

/** The picked photo as an upload part, or the reason it cannot be sent. */
export function selfieFromAsset(asset: PickedAsset, maxBytes = 5 * 1024 * 1024): LocalSelfie | { error: string } {
  const mimeType = (asset.mimeType ?? 'image/jpeg').toLowerCase();
  if (!SELFIE_TYPES.has(mimeType)) return { error: 'Usa una foto JPEG, PNG o HEIC.' };
  if (asset.fileSize && asset.fileSize > maxBytes) return { error: 'La foto pesa demasiado. Toma otra.' };
  const extension = mimeType === 'image/png' ? 'png' : mimeType.startsWith('image/hei') ? 'heic' : 'jpg';
  return { uri: asset.uri, name: asset.fileName ?? `selfie.${extension}`, mimeType };
}

export type VerificationStep = 'loading' | 'error' | 'unavailable' | 'expired' | 'capture' | 'status';

/** Which part of the flow shows, from the server status and what happened on this screen. */
export function verificationStep(input: {
  status: MyVerification | undefined;
  failed: boolean;
  challenge: VerificationChallenge | null;
  secondsLeft: number;
  expiredByServer: boolean;
  unavailable: boolean;
}): VerificationStep {
  if (input.unavailable) return 'unavailable';
  if (input.challenge) return input.secondsLeft === 0 || input.expiredByServer ? 'expired' : 'capture';
  if (input.failed) return 'error';
  return input.status ? 'status' : 'loading';
}

/** The open challenge: one just requested here, else the one the server still holds (resume). */
export function activeChallenge(requested: VerificationChallenge | null, status: MyVerification | undefined): VerificationChallenge | null {
  if (requested) return requested;
  return status?.status === 'PENDING_UPLOAD' ? status.challenge : null;
}

// «Ahora no» on the CTA: in memory for this app session, never persisted.
let ctaDismissed = false;
const ctaListeners = new Set<() => void>();

export const verificationCtaDismissal = {
  get: () => ctaDismissed,
  dismiss() {
    ctaDismissed = true;
    ctaListeners.forEach((listener) => listener());
  },
  reset() {
    ctaDismissed = false;
    ctaListeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    ctaListeners.add(listener);
    return () => {
      ctaListeners.delete(listener);
    };
  },
};
