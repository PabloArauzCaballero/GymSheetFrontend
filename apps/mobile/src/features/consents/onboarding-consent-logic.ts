/**
 * Pure rules of the onboarding consents (no React Native: runs under `node --test`).
 * Mirrors `onboarding.service.ts`: physical considerations without the health
 * consent answer 400 CONSENT_REQUIRED; without considerations it is optional.
 */

/** Considerations typed but the health consent not given: the step cannot be saved yet. */
export function healthConsentMissing(considerations: string, consentHealth: boolean): boolean {
  return considerations.trim() !== '' && !consentHealth;
}

/** The preferences step can be saved: data consent given, health consent when it is needed. */
export function preferencesConsentsReady(considerations: string, consentHealth: boolean, consentData: boolean): boolean {
  return consentData && !healthConsentMissing(considerations, consentHealth);
}
