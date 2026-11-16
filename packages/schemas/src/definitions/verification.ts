import { z } from 'zod';

/**
 * Franja 6 contracts: person verification by selfie with a random gesture,
 * reviewed by staff. Mirrors the backend's `src/modules/verification`
 * (`verification.mapper.ts`, `verification.catalog.ts`, `verification.schemas.ts`).
 */

/** Lifecycle of one attempt (`social.photo_verifications.status`). */
export const verificationAttemptStatuses = [
  'PENDING_UPLOAD',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
] as const;
export type VerificationAttemptStatus = (typeof verificationAttemptStatuses)[number];

/** `GET /me/verification` adds NONE (never tried) and REVOKED (approved, then the compared photos were removed). */
export const myVerificationStatuses = [...verificationAttemptStatuses, 'NONE', 'REVOKED'] as const;
export type MyVerificationStatus = (typeof myVerificationStatuses)[number];

/** Closed list of rejection reasons (`VERIFICATION_REJECTION_REASONS`). */
export const verificationRejectionReasons = [
  'FACE_NOT_VISIBLE',
  'GESTURE_MISMATCH',
  'DOES_NOT_MATCH_PHOTOS',
  'MULTIPLE_PEOPLE',
  'LOW_QUALITY',
  'OTHER',
] as const;
export type VerificationRejectionReason = (typeof verificationRejectionReasons)[number];

/**
 * The gesture comes with the backend's instruction. The code stays an open
 * string: a gesture added server-side must not break the whole status screen,
 * the client simply shows the instruction it received.
 */
export const verificationGestureSchema = z.object({
  code: z.string().min(1),
  instruction: z.string().min(1),
});
export type VerificationGesture = z.infer<typeof verificationGestureSchema>;

/** `POST /me/verification/challenge` and `challenge` inside the status. */
export const verificationChallengeSchema = z.object({
  id: z.string().uuid(),
  gesture: verificationGestureSchema,
  expiresAt: z.string().datetime({ offset: true }),
});
export type VerificationChallenge = z.infer<typeof verificationChallengeSchema>;

export const verificationDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().nullable(),
  /** Member-facing text of the reason, written by the backend. */
  reasonText: z.string().nullable(),
  decidedAt: z.string(),
});
export type VerificationDecision = z.infer<typeof verificationDecisionSchema>;

/** `GET /me/verification`. */
export const myVerificationSchema = z.object({
  status: z.enum(myVerificationStatuses),
  verifiedAt: z.string().nullable(),
  challenge: verificationChallengeSchema.nullable(),
  lastDecision: verificationDecisionSchema.nullable(),
  /** Set when the daily attempt cap is reached: no new challenge before it. */
  canRetryAt: z.string().nullable(),
});
export type MyVerification = z.infer<typeof myVerificationSchema>;

/** `POST /me/verification/:id/selfie` and `POST /admin/verifications/:id/decide`. */
export const verificationSubmissionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(verificationAttemptStatuses),
  submittedAt: z.string().nullable(),
});
export type VerificationSubmission = z.infer<typeof verificationSubmissionSchema>;

/** One item of `GET /admin/verifications` (a plain array, oldest first). */
export const verificationQueueItemSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(verificationAttemptStatuses),
  member: z.object({ id: z.string().uuid(), name: z.string() }),
  gesture: verificationGestureSchema,
  submittedAt: z.string().nullable(),
  /** Short-lived link signed for this moderator; null when no selfie is stored. */
  selfie: z.object({ url: z.string().min(1), expiresAt: z.string() }).nullable(),
  /** Visible gallery only: hidden photos never reach the moderator. */
  profilePhotos: z.array(z.object({ id: z.string().uuid(), url: z.string().min(1) })),
});
export type VerificationQueueItem = z.infer<typeof verificationQueueItemSchema>;
export const verificationQueueSchema = z.array(verificationQueueItemSchema);

/** `POST /admin/verifications/:id/decide`: an approval names the photos compared, a rejection its reason. */
export const decideVerificationInputSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('APPROVE'),
    comparedPhotoIds: z.array(z.string().uuid()).min(1).max(12),
  }),
  z.object({ decision: z.literal('REJECT'), reason: z.enum(verificationRejectionReasons) }),
]);
export type DecideVerificationInput = z.infer<typeof decideVerificationInputSchema>;

/** 503: storage cannot hold (and erase) selfies; the feature is closed. */
export const VERIFICATION_UNAVAILABLE = 'VERIFICATION_UNAVAILABLE';
/** 409: the gesture's deadline passed; ask for a new one. */
export const VERIFICATION_CHALLENGE_EXPIRED = 'VERIFICATION_CHALLENGE_EXPIRED';
/** 409: the gallery changed while staff reviewed; reload the item. */
export const VERIFICATION_PHOTOS_CHANGED = 'VERIFICATION_PHOTOS_CHANGED';
/** 400 (member) / 409 (staff): not enough visible profile photos to compare. */
export const VERIFICATION_PHOTOS_REQUIRED = 'VERIFICATION_PHOTOS_REQUIRED';
/** 429: daily attempt cap; `details.retryAfterSeconds`. */
export const VERIFICATION_RATE_LIMITED = 'VERIFICATION_RATE_LIMITED';
export const VERIFICATION_IN_REVIEW = 'VERIFICATION_IN_REVIEW';
export const VERIFICATION_ALREADY_VERIFIED = 'VERIFICATION_ALREADY_VERIFIED';
/** 409: the attempt no longer accepts that change (someone else decided it). */
export const VERIFICATION_STATE_CONFLICT = 'VERIFICATION_STATE_CONFLICT';
