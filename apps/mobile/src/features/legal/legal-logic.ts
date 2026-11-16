import { legalDocumentLabels } from '@gymsheet/domain';
import type { LegalDocument } from '@gymsheet/schemas';

export { legalGateCopy, legalVersionLabel, outdatedCurrentDocuments, termsVersionOf } from '@gymsheet/domain';

/**
 * Pure legal-acceptance rules of the app, kept free of React Native imports so
 * `node --test` can exercise them. Codes mirror `LEGAL_ACCEPTANCE_REQUIRED` and
 * `TERMS_VERSION_OUTDATED` from `@gymsheet/schemas`.
 */
const LEGAL_ACCEPTANCE_REQUIRED = 'LEGAL_ACCEPTANCE_REQUIRED';
const TERMS_VERSION_OUTDATED = 'TERMS_VERSION_OUTDATED';

export type ClientPlatform = 'ios' | 'android' | 'web';

/** `X-Client-Platform` value for `Platform.OS`; the backend stores it with each acceptance. */
export function clientPlatform(os: string): ClientPlatform {
  return os === 'ios' || os === 'android' ? os : 'web';
}

/**
 * A raw response blocked until the person accepts the current documents, seen
 * by the transport before any ApiError exists. Thrown errors are judged by the
 * shared `isLegalAcceptanceRequired` of `@gymsheet/api-client` (retries, toasts).
 */
export function isLegalAcceptanceResponse(status: number, body: unknown): boolean {
  if (status !== 428) return false;
  // Any 428 from this API is the legal gate; the code only confirms it.
  const code = (body as { code?: unknown } | null)?.code;
  return code === undefined || code === LEGAL_ACCEPTANCE_REQUIRED;
}

export function isTermsVersionOutdated(error: unknown): error is { code: string; details?: unknown } {
  return (error as { code?: unknown } | null)?.code === TERMS_VERSION_OUTDATED;
}

/** Where each document is read in the app, and how it is named. */
export const legalDocumentRoutes: Readonly<Record<LegalDocument, { label: string; href: '/(auth)/terminos' | '/(auth)/privacidad'; path: string }>> = {
  TERMS: { label: legalDocumentLabels.TERMS, href: '/(auth)/terminos', path: '/terminos' },
  PRIVACY: { label: legalDocumentLabels.PRIVACY, href: '/(auth)/privacidad', path: '/privacidad' },
};

/** True while the person reads a document from the gate (the gate steps aside). */
export function isReadingLegalDocument(pathname: string): boolean {
  return Object.values(legalDocumentRoutes).some((route) => route.path === pathname);
}
