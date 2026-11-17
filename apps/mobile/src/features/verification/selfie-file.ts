import * as FileSystem from 'expo-file-system/legacy';

/**
 * The camera writes the selfie (biometric data) to the app cache. It must not
 * outlive the flow: deleted once uploaded, replaced, retaken or abandoned.
 * Best effort and idempotent — a failure here never blocks the flow.
 */
export async function discardSelfieFile(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}
