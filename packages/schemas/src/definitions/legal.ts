import { z } from 'zod';
import { consentKinds } from './privacy';

/**
 * Legal documents of the backend's `src/modules/legal` catalog. A person
 * accepts TERMS, PRIVACY and COMMUNITY (the terms incorporate the community
 * rules); a business account accepts BUSINESS_TERMS, BUSINESS_DPA and PRIVACY
 * (`GET /legal/current?accountKind=BUSINESS`, ADR-0020).
 */
export const legalDocuments = ['TERMS', 'PRIVACY', 'COMMUNITY', 'BUSINESS_TERMS', 'BUSINESS_DPA'] as const;
export type LegalDocument = (typeof legalDocuments)[number];

export const legalDocumentVersionSchema = z.object({
  document: z.enum(legalDocuments),
  version: z.string(),
});
export type LegalDocumentVersion = z.infer<typeof legalDocumentVersionSchema>;

/** A published document: its version plus the SHA-256 of the exact text (null when unknown). */
export const publishedLegalDocumentSchema = legalDocumentVersionSchema.extend({
  contentSha256: z.string().nullable().optional(),
});
export type PublishedLegalDocument = z.infer<typeof publishedLegalDocumentSchema>;

/**
 * Separate consents `GET /legal/current` can list: the person's privacy consents plus the business
 * set's `KYC_SELFIE` (ADR-0021). Kept apart from `consentKinds`, which drives the person's settings.
 */
export const legalConsentKinds = [...consentKinds, 'KYC_SELFIE'] as const;
export const legalConsentVersionSchema = z.object({ kind: z.enum(legalConsentKinds), version: z.string() });
export type LegalConsentVersion = z.infer<typeof legalConsentVersionSchema>;

/** `GET /legal/current` (public): documents and the current version of each separate consent. */
export const currentLegalDocumentsSchema = z.object({
  documents: z.array(publishedLegalDocumentSchema),
  consents: z.array(legalConsentVersionSchema).default([]),
});
export type CurrentLegalDocuments = z.infer<typeof currentLegalDocumentsSchema>;

/** `GET /me/legal/pending` and the response of `POST /me/legal/accept`. */
export const pendingLegalDocumentsSchema = z.object({
  pending: z.array(legalDocumentVersionSchema),
});
export type PendingLegalDocuments = z.infer<typeof pendingLegalDocumentsSchema>;

export const acceptLegalDocumentsSchema = z.object({
  acceptances: z.array(legalDocumentVersionSchema).min(1).max(legalDocuments.length),
});
export type AcceptLegalDocumentsInput = z.infer<typeof acceptLegalDocumentsSchema>;

/** Stable backend codes. */
export const LEGAL_ACCEPTANCE_REQUIRED = 'LEGAL_ACCEPTANCE_REQUIRED';
export const TERMS_VERSION_OUTDATED = 'TERMS_VERSION_OUTDATED';
