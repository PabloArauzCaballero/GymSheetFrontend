import {
  ACCOUNT_BANNED,
  ACCOUNT_SUSPENDED,
  accountBanDetailsSchema,
  accountSuspensionDetailsSchema,
  type SanctionReason,
} from '@gymsheet/schemas';
import { legalContacts } from './legal';

/**
 * Moderation sanctions as the affected person reads them: a suspension
 * (`ACCOUNT_SUSPENDED`: 403 at login/signup, 401 with a valid token) or an
 * expulsion (`ACCOUNT_BANNED`: 403 at login). Read by code and details, never
 * by the sentence. Duck-typed: no HTTP client needed.
 */

export type AccountSuspension = { pendingReview: boolean; until: string | null; reason: SanctionReason | null };
export type AccountBan = { reason: SanctionReason | null };

function failureOf(error: unknown): { code?: unknown; details?: unknown } {
  return (error ?? {}) as { code?: unknown; details?: unknown };
}

/** The suspension a failed request reports, or null for any other failure. */
export function accountSuspensionOf(error: unknown): AccountSuspension | null {
  const { code, details } = failureOf(error);
  if (code !== ACCOUNT_SUSPENDED) return null;
  const parsed = accountSuspensionDetailsSchema.safeParse(details);
  // A suspension without readable details is still a suspension: say so without a date.
  if (!parsed.success) return { pendingReview: false, until: null, reason: null };
  const reason = parsed.data.reason ?? null;
  return parsed.data.pendingReview
    ? { pendingReview: true, until: null, reason }
    : { pendingReview: false, until: parsed.data.until, reason };
}

/** The expulsion a failed login reports, or null for any other failure. */
export function accountBanOf(error: unknown): AccountBan | null {
  const { code, details } = failureOf(error);
  if (code !== ACCOUNT_BANNED) return null;
  const parsed = accountBanDetailsSchema.safeParse(details);
  return { reason: parsed.success ? (parsed.data.reason ?? null) : null };
}

/** «Motivo: {label} ({text}).»: the backend's `reasonSentence`, built from the public reason. */
export function sanctionReasonSentence(reason: SanctionReason | null | undefined): string | null {
  return reason ? `Motivo: ${reason.label} (${reason.text}).` : null;
}

const sentences = (...parts: Array<string | null>) => parts.filter(Boolean).join(' ');

const longDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
};

const suspensionText = {
  pendingReview: (motivo: string | null) =>
    sentences('Tu cuenta está suspendida mientras revisamos una denuncia.', motivo, 'Te avisamos por correo cuando terminemos.'),
  until: (date: string, motivo: string | null) => sentences(`Tu cuenta está suspendida hasta el ${date}.`, motivo),
  undated: (motivo: string | null) => sentences('Tu cuenta está suspendida por incumplir las normas de la comunidad.', motivo),
};

const suspendedRights = `Mientras dure, no puedes usar la app. Para pedir tus datos, corregirlos, borrarlos o retirar un consentimiento, escribe a ${legalContacts.privacy}.`;

function suspensionMessage(suspension: AccountSuspension): string {
  const motivo = sanctionReasonSentence(suspension.reason);
  if (suspension.pendingReview) return suspensionText.pendingReview(motivo);
  const date = suspension.until ? longDate(suspension.until) : null;
  return date ? suspensionText.until(date, motivo) : suspensionText.undated(motivo);
}

export const accountSuspensionCopy = {
  title: 'Tu cuenta está suspendida',
  rules: 'Leer las normas',
  /** What the person can still ask for while suspended. */
  rights: suspendedRights,
  /** The sentence for one suspension, with its reason (safe to destructure). */
  message: suspensionMessage,
  /** The sentence plus the rights line: what login and the suspended exit show. */
  notice: (suspension: AccountSuspension): string => `${suspensionMessage(suspension)} ${suspendedRights}`,
} as const;

export const accountBanCopy = {
  title: 'Tu cuenta fue expulsada',
  message: (ban: AccountBan): string =>
    sentences(
      'Tu cuenta fue expulsada por incumplir varias veces las normas de la comunidad.',
      sanctionReasonSentence(ban.reason),
      `Para tus datos, escribe a ${legalContacts.privacy}.`,
    ),
} as const;

/** What a refused login or session says for a sanction; null for any other failure. */
export function accountSanctionMessage(error: unknown): string | null {
  const suspension = accountSuspensionOf(error);
  if (suspension) return accountSuspensionCopy.notice(suspension);
  const ban = accountBanOf(error);
  return ban ? accountBanCopy.message(ban) : null;
}
