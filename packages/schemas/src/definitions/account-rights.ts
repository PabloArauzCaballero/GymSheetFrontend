import { z } from 'zod';
import { emailPinSchema } from './account-security';

/**
 * Franja 4 contracts: account rights (rename, email change, export, closure).
 * Mirror the backend's `src/modules/account` and `src/modules/export`.
 */

/** `PATCH /me/account` body: same bounds as signup. */
export const updateAccountNameSchema = z.object({
  nombreCompleto: z.string().trim().min(3, 'Escribe al menos 3 letras.').max(180, 'Máximo 180 caracteres.'),
});
export type UpdateAccountNameInput = z.infer<typeof updateAccountNameSchema>;

/** `POST /me/email/change` body. Answers 202; the PIN goes to the new address. */
export const emailChangeRequestSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email('Escribe un correo válido.').max(180),
  password: z.string().min(1, 'Escribe tu contraseña.').max(128),
});
export type EmailChangeRequestInput = z.infer<typeof emailChangeRequestSchema>;

/** `POST /me/email/change/confirm` body: the 6-digit PIN. */
export const emailChangeConfirmSchema = emailPinSchema;
export const emailChangeConfirmResponseSchema = z.object({
  email: z.string(),
  emailVerified: z.literal(true),
});
export type EmailChangeConfirmResponse = z.infer<typeof emailChangeConfirmResponseSchema>;

/** The `{ accepted: true }` body of a 202 (email change request, closure PIN). */
export const acceptedResponseSchema = z.object({ accepted: z.literal(true) });

export const closurePreviewItemSchema = z.object({
  table: z.string(),
  label: z.string(),
  count: z.number().int(),
  reason: z.string().nullable(),
});
export type ClosurePreviewItem = z.infer<typeof closurePreviewItemSchema>;

/**
 * Something to solve before the closure can go ahead (ADR-0028): a business
 * with QR receipts still waiting for its decision. The code stays a string so
 * a newer backend's blocker does not break the preview.
 */
export const closureBlockerSchema = z.object({ code: z.string(), count: z.number().int().nonnegative() });
export type ClosureBlocker = z.infer<typeof closureBlockerSchema>;

/** `GET /me/account/closure-preview`: what closing deletes, anonymizes and keeps. */
export const closurePreviewSchema = z.object({
  /** False for platform accounts (REPP staff). */
  allowed: z.boolean(),
  /** Empty when the closure can go ahead now; optional for servers before franja 8f. */
  blockers: z.array(closureBlockerSchema).optional(),
  /** The password always works; an emailed PIN too for Google/Apple accounts. */
  proof: z.object({ password: z.boolean(), emailPin: z.boolean() }),
  account: z.object({ label: z.string(), disposition: z.string(), reason: z.string() }),
  deleted: z.array(closurePreviewItemSchema),
  anonymized: z.array(closurePreviewItemSchema),
  kept: z.array(closurePreviewItemSchema),
});
export type ClosurePreview = z.infer<typeof closurePreviewSchema>;

/** `DELETE /me/account` body: exactly one proof. */
export const closeAccountInputSchema = z.union([
  z.object({ password: z.string().min(1, 'Escribe tu contraseña.').max(128) }).strict(),
  z.object({ pin: emailPinSchema.shape.pin }).strict(),
]);
export type CloseAccountInput = z.infer<typeof closeAccountInputSchema>;

export const closeAccountResultSchema = z.object({ closed: z.literal(true), closedAt: z.string() });
export type CloseAccountResult = z.infer<typeof closeAccountResultSchema>;

export const accountExportStatuses = ['PENDING', 'READY', 'FAILED'] as const;
export type AccountExportState = (typeof accountExportStatuses)[number];

/** `POST /me/export` (202) and `GET /me/export/:id`. */
export const accountExportStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(accountExportStatuses),
  requestedAt: z.string(),
  completedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  /** Relative to the API prefix; only while the archive can be downloaded. */
  downloadPath: z.string().nullable(),
});
export type AccountExportStatus = z.infer<typeof accountExportStatusSchema>;

/** `GET /me/export/latest`: the last request of the account, so a reload resumes it. */
export const latestAccountExportResponseSchema = z.object({ export: accountExportStatusSchema.nullable() });
export type LatestAccountExportResponse = z.infer<typeof latestAccountExportResponseSchema>;

/** Stable backend codes of the account rights. */
export const CURRENT_PASSWORD_INVALID = 'CURRENT_PASSWORD_INVALID';
export const EMAIL_UNCHANGED = 'EMAIL_UNCHANGED';
export const EMAIL_CHANGE_BLOCKED_BY_SANCTION = 'EMAIL_CHANGE_BLOCKED_BY_SANCTION';
export const ACCOUNT_CLOSURE_STAFF = 'ACCOUNT_CLOSURE_STAFF';
export const CLOSURE_PROOF_REQUIRED = 'CLOSURE_PROOF_REQUIRED';
export const ACCOUNT_EXPORT_RATE_LIMITED = 'ACCOUNT_EXPORT_RATE_LIMITED';
export const ACCOUNT_EXPORT_NOT_READY = 'ACCOUNT_EXPORT_NOT_READY';
/** 409 of `DELETE /me/account` while a business still has QR receipts to decide (ADR-0028). */
export const BUSINESS_HAS_PENDING_VERIFICATIONS = 'BUSINESS_HAS_PENDING_VERIFICATIONS';
