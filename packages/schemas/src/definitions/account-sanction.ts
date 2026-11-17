import { z } from 'zod';

/**
 * Moderation sanctions as the affected account reads them at login and on
 * every request, plus the closure of a staff account by its gym. Mirrors the
 * backend's `src/common/moderation/account-suspension.ts` and
 * `src/modules/account/admin-account-closure.controller.ts`.
 */

/** Public reason of a sanction: moderation code, category label and short text. */
export const sanctionReasonSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  text: z.string().min(1),
});
export type SanctionReason = z.infer<typeof sanctionReasonSchema>;

// A malformed reason must not hide the suspension itself: it is simply dropped.
const optionalReason = sanctionReasonSchema.optional().catch(undefined);

/**
 * `ACCOUNT_SUSPENDED` details: 403 at login/signup, 401 for a still-valid token.
 * A pending-review suspension has no end date; a dated one carries `until`.
 */
export const accountSuspensionDetailsSchema = z.union([
  z.object({ pendingReview: z.literal(true), reason: optionalReason }),
  z.object({ pendingReview: z.literal(false), until: z.string(), reason: optionalReason }),
]);
export type AccountSuspensionDetails = z.infer<typeof accountSuspensionDetailsSchema>;

/** `ACCOUNT_BANNED` details (403 at login, only after the owner was proven). */
export const accountBanDetailsSchema = z.object({ reason: optionalReason });
export type AccountBanDetails = z.infer<typeof accountBanDetailsSchema>;

export const ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED';
export const ACCOUNT_BANNED = 'ACCOUNT_BANNED';
