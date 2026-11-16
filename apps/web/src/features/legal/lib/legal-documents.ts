import { ApiError } from '@/shared/api/api-error';
import { legalDocumentLabels } from '@gymsheet/domain';
import { LEGAL_ACCEPTANCE_REQUIRED, TERMS_VERSION_OUTDATED, type LegalDocument } from '@/shared/api/schemas';

export { legalGateCopy, legalVersionLabel, outdatedCurrentDocuments, termsVersionOf } from '@gymsheet/domain';

/** Where each document is read on the web, and how it is named. */
export const legalDocumentLinks: Readonly<Record<LegalDocument, { label: string; href: string }>> = {
  TERMS: { label: legalDocumentLabels.TERMS, href: '/terminos' },
  PRIVACY: { label: legalDocumentLabels.PRIVACY, href: '/privacidad' },
};

/** Any request blocked until the person accepts the current documents (428). */
export function isLegalAcceptanceRequired(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.code === LEGAL_ACCEPTANCE_REQUIRED || error.status === 428)
  );
}

export function isTermsVersionOutdated(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === TERMS_VERSION_OUTDATED;
}

