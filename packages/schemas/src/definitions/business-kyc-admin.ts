import { z } from 'zod';
import { kycDocumentSchema, kycSubmissionSchema } from './business-kyc';

/**
 * REPP's KYC console (backend ADR-0021 §console, `admin-business-kyc.controller.ts`
 * and `admin-business.controller.ts`): `MODERATOR` and `SYSTEM_ADMIN` only.
 */

export const kycQueues = ['REVIEW', 'POST_REVIEW'] as const;
export type KycQueue = (typeof kycQueues)[number];

const nullableText = z.string().nullable();

export const kycQueueItemSchema = z.object({
  submissionId: z.string().uuid(),
  accountId: z.string().uuid(),
  entityId: z.string().uuid(),
  entityType: z.string(),
  tradeName: nullableText,
  handle: nullableText,
  version: z.number().int(),
  purpose: z.string(),
  status: z.string(),
  submittedAt: z.string(),
  dueAt: z.string(),
  overdue: z.boolean(),
  claimedByUserId: nullableText,
  claimedAt: nullableText,
  failedChecks: z.array(z.string()),
});
export type KycQueueItem = z.infer<typeof kycQueueItemSchema>;

export const kycQueuePageSchema = z.object({ items: z.array(kycQueueItemSchema), nextCursor: nullableText });
export type KycQueuePage = z.infer<typeof kycQueuePageSchema>;

export const kycCheckSchema = z.object({
  code: z.string(),
  outcome: z.string(),
  detail: z.record(z.string(), z.unknown()).nullable().optional(),
  durationMs: z.number().nullable().optional(),
  createdAt: z.string(),
});
export type KycCheck = z.infer<typeof kycCheckSchema>;

export const kycAdminDocumentSchema = kycDocumentSchema.extend({
  deleted: z.boolean(),
  deleteReason: nullableText,
  selfieChallengeCode: nullableText,
});
export type KycAdminDocument = z.infer<typeof kycAdminDocumentSchema>;

/** `GET /admin/business/kyc/:id`: identity in clear (audited by the backend), `no-store`. */
export const kycAdminDetailSchema = z.object({
  submission: kycSubmissionSchema,
  identity: z.object({ nit: nullableText, repCiNumber: nullableText, phone: nullableText }),
  phoneVerified: z.boolean(),
  account: z.object({
    id: z.string().uuid(),
    email: z.string(),
    status: z.string(),
    kycStatus: z.string(),
    entityType: z.string(),
  }),
  entity: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      status: z.string(),
      isVerified: z.boolean(),
      city: nullableText,
      logoUrl: nullableText,
    })
    .nullable(),
  handle: z.object({ handle: z.string(), status: z.string() }).nullable(),
  documents: z.array(kycAdminDocumentSchema),
  checks: z.array(kycCheckSchema),
  decisions: z.array(
    z.object({
      id: z.string(),
      decision: z.string(),
      actorUserId: nullableText,
      reasonCodes: z.array(z.string()),
      note: nullableText,
      allowResubmit: z.boolean().nullable(),
      createdAt: z.string(),
    }),
  ),
  history: z.array(z.object({ fromStatus: z.string(), toStatus: z.string(), actorUserId: nullableText, at: z.string() })),
  claimedByUserId: nullableText,
});
export type KycAdminDetail = z.infer<typeof kycAdminDetailSchema>;

export const kycClaimResultSchema = z.object({ claimedByUserId: z.string(), claimedAt: z.string() });
export const kycReleaseResultSchema = z.object({ released: z.literal(true) });

export const kycRejectionReasonCodes = [
  'DOCUMENT_UNREADABLE',
  'DOCUMENT_MISMATCH',
  'SELFIE_MISMATCH',
  'GESTURE_MISMATCH',
  'NIT_INVALID',
  'LEGAL_NAME_MISMATCH',
  'IMPERSONATION',
  'DUPLICATE_ACCOUNT',
  'PROHIBITED_ACTIVITY',
  'FRAUD_SUSPECTED',
  'OTHER',
] as const;
export type KycRejectionReasonCode = (typeof kycRejectionReasonCodes)[number];

/** `POST /admin/business/kyc/:id/decide` body (backend `kycDecisionSchema`). */
export const kycDecideInputSchema = z
  .object({
    decision: z.enum(['APPROVE', 'POST_REVIEW_OK', 'REJECT']),
    reasonCodes: z.array(z.enum(kycRejectionReasonCodes)).max(6),
    note: z.string().trim().max(1000).optional(),
    allowResubmit: z.boolean().optional(),
  })
  .strict();
export type KycDecideInput = z.infer<typeof kycDecideInputSchema>;

export const kycDecisionResultSchema = z.object({ status: z.string(), decisionId: z.string() });

export const businessSuspensionReasonCodes = [
  'FRAUD_SUSPECTED',
  'IMPERSONATION',
  'PAYMENT_COMPLAINTS',
  'PROHIBITED_ACTIVITY',
  'KYC_MISSING',
  'OTHER',
] as const;
export type BusinessSuspensionReasonCode = (typeof businessSuspensionReasonCodes)[number];

export const businessAdminAccountSchema = z.object({
  accountId: z.string().uuid(),
  email: z.string(),
  entityId: z.string().uuid(),
  entityType: z.string(),
  name: z.string(),
  handle: nullableText,
  status: z.string(),
  kycStatus: z.string(),
  entityStatus: z.string(),
  isVerified: z.boolean(),
  createdAt: z.string(),
});
export type BusinessAdminAccount = z.infer<typeof businessAdminAccountSchema>;

export const businessAdminAccountsPageSchema = z.object({
  items: z.array(businessAdminAccountSchema),
  nextCursor: nullableText,
});

export const businessAccountActionResultSchema = z.object({ status: z.string() });
