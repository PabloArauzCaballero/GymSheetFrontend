import { consentCopy, consentRequiredKind, consentsSectionCopy, settingsConsents } from '@gymsheet/domain';
import { CONSENT_VERSION_OUTDATED, type Consent, type ConsentKind } from '@gymsheet/schemas';

/**
 * Mobile rules of the separate consents on top of the shared copy and rules of
 * `@gymsheet/domain` (no React Native: runs under `node --test`).
 */

export { consentCopy, consentRequiredKind, consentsSectionCopy };

/** Under every grant prompt: the consent is never a one-way door. */
export const consentRevocableNote = 'Puedes retirarlo cuando quieras en Ajustes › Privacidad y datos.';

/** Settings list: the shared `settingsConsentKinds`, in the backend's order, so web and mobile list them alike. */
export function sortConsents(consents: readonly Consent[]): Consent[] {
  return settingsConsents(consents);
}

/** Granted to an older text: the person is asked again, the row says so. */
export function needsRenewal(consent: Pick<Consent, 'granted' | 'upToDate'>): boolean {
  return consent.granted && !consent.upToDate;
}

/** One line under each consent: its state in words, never only a switch. */
export function consentStatusLabel(consent: Pick<Consent, 'granted' | 'upToDate'>): string {
  if (needsRenewal(consent)) return consentsSectionCopy.outdated;
  return consent.granted ? consentsSectionCopy.granted : consentsSectionCopy.notGranted;
}

/** Body of the confirmation before granting (what it is for) or revoking (what is erased). */
export function consentPromptMessage(kind: ConsentKind, granting: boolean): string {
  const copy = consentCopy[kind];
  return granting ? `${copy.grantLabel} ${consentRevocableNote}` : copy.revokeEffect;
}

/** A 409 CONSENT_VERSION_OUTDATED: the text changed while the person read it. */
export function isConsentVersionOutdated(error: unknown): boolean {
  return (error as { code?: unknown } | null | undefined)?.code === CONSENT_VERSION_OUTDATED;
}

export type ConsentRequestSteps = {
  /** Shows the consent text; `true` when the person accepts. */
  confirm: (kind: ConsentKind) => Promise<boolean>;
  /** Current version of the text, from `GET /me/consents`. */
  currentVersion: (kind: ConsentKind) => Promise<string | undefined>;
  grant: (kind: ConsentKind, version: string) => Promise<void>;
  /** The text changed under the prompt (409): refresh and tell the person. */
  onOutdated: (kind: ConsentKind) => void;
};

/**
 * Asks for one consent and records it with the version the server says is
 * current. A 409 means the person accepted an old text: nothing is recorded,
 * the caller is told so and the list is refreshed. Other errors throw.
 */
export async function requestConsent(kind: ConsentKind, steps: ConsentRequestSteps): Promise<boolean> {
  if (!(await steps.confirm(kind))) return false;
  const version = await steps.currentVersion(kind);
  if (!version) return false;
  try {
    await steps.grant(kind, version);
    return true;
  } catch (error) {
    if (!isConsentVersionOutdated(error)) throw error;
    steps.onOutdated(kind);
    return false;
  }
}

/**
 * Generic handler for 400 CONSENT_REQUIRED: runs `action`; when the server asks
 * for a consent, `ensureConsent` asks the person (and records the grant), and
 * the action is retried once. `{ done: false }` when the person said no, so
 * the caller stays on the screen without an error toast.
 */
export async function runWithConsent<T>(
  action: () => Promise<T>,
  ensureConsent: (kind: ConsentKind) => Promise<boolean>,
): Promise<{ done: true; value: T } | { done: false; kind: ConsentKind }> {
  try {
    return { done: true, value: await action() };
  } catch (error) {
    const kind = consentRequiredKind(error);
    if (!kind) throw error;
    if (!(await ensureConsent(kind))) return { done: false, kind };
    // A second CONSENT_REQUIRED is a real failure (revoked meanwhile): it throws.
    return { done: true, value: await action() };
  }
}
