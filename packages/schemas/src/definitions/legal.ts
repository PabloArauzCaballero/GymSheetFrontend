import { z } from 'zod';
import { consentVersionSchema } from './privacy';

/**
 * Legal documents a person accepts. Mirrors the backend's `src/modules/legal`
 * catalog. COMMUNITY is the community rules: the terms incorporate them, so
 * signup and the legal gate accept all three.
 */
export const legalDocuments = ['TERMS', 'PRIVACY', 'COMMUNITY'] as const;
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

/** `GET /legal/current` (public): documents and the current version of each separate consent. */
export const currentLegalDocumentsSchema = z.object({
  documents: z.array(publishedLegalDocumentSchema),
  consents: z.array(consentVersionSchema).default([]),
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
