import { z } from 'zod';
import { legalKindSchema } from './business';

/**
 * Business KYC (backend ADR-0021, franja 8b): the wizard's steps 4–7 and the
 * result. Mirrors `src/modules/business-kyc` (`kyc.mapper.ts`,
 * `kyc-status.service.ts`, `kyc-submit.service.ts`). Enums the client only
 * reads stay open strings, so a new backend value never breaks the screen.
 */

export const kycDocumentKinds = ['CI_FRONT', 'CI_BACK', 'SELFIE', 'SEPREC'] as const;
export const kycDocumentKindSchema = z.enum(kycDocumentKinds);
export type KycDocumentKind = z.infer<typeof kycDocumentKindSchema>;

export const ciExtensions = ['LP', 'CB', 'SC', 'OR', 'PT', 'TJ', 'CH', 'BE', 'PD'] as const;
export const ciExtensionSchema = z.enum(ciExtensions);
export type CiExtension = z.infer<typeof ciExtensionSchema>;

export const kycSubmissionStatuses = [
  'DRAFT',
  'SUBMITTED',
  'AUTO_APPROVED',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
  'SUPERSEDED',
] as const;
export type KycSubmissionStatus = (typeof kycSubmissionStatuses)[number];

export const kycDocumentSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  readable: z.boolean(),
  readabilityCodes: z.array(z.string()),
  width: z.number().nullable(),
  height: z.number().nullable(),
  uploadedAt: z.string(),
});
export type KycDocument = z.infer<typeof kycDocumentSchema>;

export const kycSelfieChallengeSchema = z.object({ code: z.string(), instruction: z.string(), expiresAt: z.string() });
export type KycSelfieChallenge = z.infer<typeof kycSelfieChallengeSchema>;

const nullableText = z.string().nullable();

export const kycSubmissionFieldsSchema = z.object({
  tradeName: nullableText,
  primaryCategoryId: nullableText,
  legalName: nullableText,
  nitMasked: nullableText,
  repFullName: nullableText,
  repCiMasked: nullableText,
  repCiComplement: nullableText,
  repCiExtension: nullableText,
  specialty: nullableText,
  address: nullableText,
  seprecNumber: nullableText,
  phoneMasked: nullableText,
});
export type KycSubmissionFields = z.infer<typeof kycSubmissionFieldsSchema>;

export const kycSubmissionSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int(),
  purpose: z.string(),
  status: z.string(),
  legalKind: legalKindSchema,
  fields: kycSubmissionFieldsSchema,
  documents: z.array(kycDocumentSchema),
  selfieChallenge: kycSelfieChallengeSchema.nullable(),
  submittedAt: nullableText,
  decidedAt: nullableText,
  reviewDueAt: nullableText,
  postReviewDueAt: nullableText,
});
export type KycSubmission = z.infer<typeof kycSubmissionSchema>;

export const phoneStateSchema = z.object({
  phoneMasked: z.string(),
  verified: z.boolean(),
  verifiedAt: nullableText,
});
export type PhoneState = z.infer<typeof phoneStateSchema>;

export const kycDecisionSummarySchema = z.object({
  decision: z.string(),
  reasonCodes: z.array(z.string()),
  reasons: z.array(z.string()),
  allowResubmit: z.boolean().nullable(),
  decidedAt: z.string(),
});

/** `GET /business/me/kyc`: where the wizard resumes, in one read. */
export const kycStateSchema = z.object({
  kycStatus: z.string(),
  accountStatus: z.string(),
  badge: z.enum(['VERIFIED', 'NEW']).nullable(),
  submission: kycSubmissionSchema.nullable(),
  missing: z.array(z.string()),
  phone: phoneStateSchema.nullable(),
  consent: z.object({
    kind: z.literal('KYC_SELFIE'),
    granted: z.boolean(),
    upToDate: z.boolean(),
    currentVersion: z.string(),
  }),
  attempts: z.object({
    used: z.number().int(),
    max: z.number().int(),
    resubmitAvailableAt: nullableText,
    canResubmit: z.boolean(),
  }),
  lastDecision: kycDecisionSummarySchema.nullable(),
});
export type KycState = z.infer<typeof kycStateSchema>;

/** `POST /business/me/phone/verify/request` (202). `codeSent: false` = no provider configured. */
export const phoneRequestResultSchema = z.object({
  phoneMasked: z.string(),
  codeSent: z.boolean(),
  expiresAt: nullableText,
});
export type PhoneRequestResult = z.infer<typeof phoneRequestResultSchema>;

/** `PUT /business/me/kyc/consent`: only what the client reads (the rest of the consent view is dropped). */
export const kycConsentResultSchema = z.object({ kind: z.string(), granted: z.boolean() });

/** `POST /business/me/kyc/submit` (200). */
export const kycSubmitResultSchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum(['AUTO_APPROVED', 'IN_REVIEW']),
  reviewDueAt: nullableText,
  postReviewDueAt: nullableText,
  userFacingCodes: z.array(z.string()),
  handle: nullableText,
});
export type KycSubmitResult = z.infer<typeof kycSubmitResultSchema>;

/** `POST /business/me/kyc/resubmit` and `/changes` (201): a new DRAFT version. */
export const kycNewVersionSchema = z.object({ submissionId: z.string().uuid(), version: z.number().int() });

/** `POST /business/me/media` (201): the public logo or cover. */
export const businessMediaResultSchema = z.object({ slot: z.enum(['LOGO', 'COVER']), url: z.string() });

/** `PUT /business/me/kyc/draft`: any subset; `null` clears a field. Unknown keys are a 400. */
export const kycDraftPatchSchema = z
  .object({
    legalName: z.string().trim().max(200).nullable(),
    nit: z.string().trim().max(32).nullable(),
    repFullName: z.string().trim().max(180).nullable(),
    repCiNumber: z.string().trim().max(20).nullable(),
    repCiComplement: z.string().trim().max(2).nullable(),
    repCiExtension: ciExtensionSchema.nullable(),
    specialty: z.string().trim().max(120).nullable(),
    address: z.string().trim().max(500).nullable(),
    seprecNumber: z.string().trim().max(40).nullable(),
    tradeName: z.string().trim().min(2).max(180),
    primaryCategoryId: z.string().uuid(),
  })
  .partial()
  .strict();
export type KycDraftPatch = z.infer<typeof kycDraftPatchSchema>;

/** `POST /business/me/kyc/erase` body (strict, ADR-0028): the account password confirms it. */
export const kycEraseInputSchema = z
  .object({ password: z.string().min(1, 'Escribe tu contraseña.').max(128) })
  .strict();
export type KycEraseInput = z.infer<typeof kycEraseInputSchema>;

/** `POST /business/me/kyc/erase` (200): the business is left suspended until a new KYC. */
export const kycEraseResultSchema = z.object({
  status: z.literal('SUSPENDED'),
  suspensionReasonCode: z.literal('KYC_MISSING'),
  kycStatus: z.string(),
  documentsErased: z.number().int().nonnegative(),
});
export type KycEraseResult = z.infer<typeof kycEraseResultSchema>;
