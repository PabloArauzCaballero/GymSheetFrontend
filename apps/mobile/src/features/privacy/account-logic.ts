import { ApiError } from '@gymsheet/api-client';
import { accountClosureCopy, closureProofOptions, emailChangeCopy } from '@gymsheet/domain';
import {
  ACCOUNT_CLOSURE_STAFF,
  BUSINESS_HAS_PENDING_VERIFICATIONS,
  CLOSURE_PROOF_REQUIRED,
  CURRENT_PASSWORD_INVALID,
  EMAIL_CHANGE_BLOCKED_BY_SANCTION,
  EMAIL_UNCHANGED,
  type CloseAccountInput,
  type ClosurePreview,
} from '@gymsheet/schemas';
import { pinErrorMessage } from '../email-verification/email-verification-logic.ts';

/** Pure rules of «Cambiar correo» and «Cerrar mi cuenta» (no React Native: runs under `node --test`). */

/** Where a failure is shown: next to a field, or as the form's banner. */
export type FormFailure = { field: 'password' | 'email' | 'pin' | null; message: string };

function serverMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() !== '' ? error.message : fallback;
}

/**
 * `POST /me/email/change` and its confirmation. A 409 by sanction is a banner
 * (no field fixes it); a 409 at confirmation is the address taken meanwhile.
 */
export function emailChangeFailure(error: unknown): FormFailure {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === CURRENT_PASSWORD_INVALID) return { field: 'password', message: emailChangeCopy.errors.CURRENT_PASSWORD_INVALID };
  if (code === EMAIL_UNCHANGED) return { field: 'email', message: emailChangeCopy.errors.EMAIL_UNCHANGED };
  if (code === EMAIL_CHANGE_BLOCKED_BY_SANCTION) {
    return { field: null, message: emailChangeCopy.errors.EMAIL_CHANGE_BLOCKED_BY_SANCTION };
  }
  const pin = pinErrorMessage(error);
  if (pin) return { field: 'pin', message: pin };
  if (error instanceof ApiError && error.status === 409) return { field: 'email', message: emailChangeCopy.errors.taken };
  const newEmail = error instanceof ApiError ? error.fieldErrors.newEmail : undefined;
  if (newEmail) return { field: 'email', message: newEmail };
  return { field: null, message: serverMessage(error, 'No pudimos cambiar tu correo. Inténtalo de nuevo.') };
}

export type ProofMethod = 'password' | 'pin';

/** Password always; the emailed code too for accounts created with Google or Apple. */
export function proofMethods(preview: Pick<ClosurePreview, 'proof'>): ProofMethod[] {
  return closureProofOptions(preview);
}

/** The body of `DELETE /me/account`, or `null` while the proof is incomplete. */
export function closureProof(method: ProofMethod, value: string): CloseAccountInput | null {
  if (method === 'password') return value.length > 0 ? { password: value } : null;
  const pin = value.replace(/\D/gu, '');
  return pin.length === 6 ? { pin } : null;
}

export function closureFailure(error: unknown): FormFailure {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === CURRENT_PASSWORD_INVALID) return { field: 'password', message: accountClosureCopy.errors.CURRENT_PASSWORD_INVALID };
  if (code === ACCOUNT_CLOSURE_STAFF) return { field: null, message: accountClosureCopy.errors.ACCOUNT_CLOSURE_STAFF };
  if (code === CLOSURE_PROOF_REQUIRED) return { field: null, message: accountClosureCopy.errors.CLOSURE_PROOF_REQUIRED };
  // A business with receipts to decide (ADR-0028): a banner, and the screen re-reads its blockers.
  if (code === BUSINESS_HAS_PENDING_VERIFICATIONS) return { field: null, message: accountClosureCopy.errors.BUSINESS_HAS_PENDING_VERIFICATIONS };
  const pin = pinErrorMessage(error);
  if (pin) return { field: 'pin', message: pin };
  return { field: null, message: serverMessage(error, 'No pudimos cerrar tu cuenta. Inténtalo de nuevo.') };
}

/** «Rutinas · 3», or the label alone when there is one row. */
export function closureItemLabel(item: { label: string; count: number }): string {
  return item.count > 1 ? `${item.label} · ${item.count}` : item.label;
}

/** The three groups of the preview, in reading order, empty ones left out. */
export function closureGroups(preview: ClosurePreview) {
  return [
    { key: 'deleted' as const, title: accountClosureCopy.deleted, items: preview.deleted },
    { key: 'anonymized' as const, title: accountClosureCopy.anonymized, items: preview.anonymized },
    { key: 'kept' as const, title: accountClosureCopy.kept, items: preview.kept },
  ].filter((group) => group.items.length > 0);
}
