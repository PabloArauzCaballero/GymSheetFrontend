import { z } from 'zod';

/** Legal documents a person accepts. Mirrors the backend's `src/modules/legal` catalog. */
export const legalDocuments = ['TERMS', 'PRIVACY'] as const;
export type LegalDocument = (typeof legalDocuments)[number];

export const legalDocumentVersionSchema = z.object({
  document: z.enum(legalDocuments),
  version: z.string(),
});
export type LegalDocumentVersion = z.infer<typeof legalDocumentVersionSchema>;

/** `GET /legal/current` (public). */
export const currentLegalDocumentsSchema = z.object({
  documents: z.array(legalDocumentVersionSchema),
});

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
