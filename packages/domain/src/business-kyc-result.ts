import type { KycState, KycSubmitResult } from '@gymsheet/schemas';
import { formatDateTime } from './date';

/**
 * The result screen of the KYC (plan §4.1) as a view model, from the submit
 * answer or from `GET /business/me/kyc` on a later visit. It never names a
 * blocklist or sanction check: only the user-facing codes the backend sends.
 */

export type KycOutcomeTone = 'success' | 'info' | 'warning' | 'danger';
export type KycOutcomeActionKey = 'portal' | 'publicProfile' | 'firstListing' | 'qrPayments' | 'resubmit' | 'startChange';
export type KycOutcomeAction = {
  key: KycOutcomeActionKey;
  label: string;
  /** False = shown disabled with `hint` (the screen that does it ships in a later franja). */
  available: boolean;
  hint?: string;
};
export type KycOutcome = {
  tone: KycOutcomeTone;
  title: string;
  body: string;
  notes: string[];
  actions: KycOutcomeAction[];
  handle: string | null;
};

/** What sent an attempt to manual review, in words the business can act on. */
export const userFacingCheckCopy: Readonly<Record<string, string>> = {
  PHONE_VERIFIED: 'Confirmamos tu teléfono a mano.',
  DOCUMENTS_READABLE: 'Una de tus fotos no se lee bien.',
  DUPLICATE_NIT: 'Tu NIT ya aparece en otra cuenta.',
  DUPLICATE_PHONE: 'Tu teléfono ya aparece en otra cuenta.',
  NAME_SIMILARITY: 'Tu nombre se parece al de otro negocio.',
  MATERIAL_CHANGE: 'Los cambios de datos siempre los revisa una persona.',
};

const publishedActions: KycOutcomeAction[] = [
  { key: 'portal', label: 'Ir a mi panel', available: true },
  { key: 'firstListing', label: 'Publica tu primer plan o producto', available: true },
  { key: 'qrPayments', label: 'Configura tu cobro por QR', available: true },
];

function published(handle: string | null, postReviewDueAt: string | null, verified: boolean): KycOutcome {
  return {
    tone: 'success',
    title: handle ? `¡Listo! Tu negocio ya está publicado en @${handle}` : '¡Listo! Tu negocio ya está publicado',
    body: verified
      ? 'REPP ya revisó tus datos. Tu ficha lleva «Verificado por REPP».'
      : postReviewDueAt
        ? `REPP revisará tus datos antes del ${formatDateTime(postReviewDueAt)}. Si falta algo, te avisamos.`
        : 'REPP revisará tus datos en las próximas 72 horas. Si falta algo, te avisamos.',
    notes: [],
    actions: handle ? [publishedActions[0]!, { key: 'publicProfile', label: 'Ver mi ficha', available: true }, ...publishedActions.slice(1)] : publishedActions,
    handle,
  };
}

function inReview(reviewDueAt: string | null, codes: readonly string[], handle: string | null): KycOutcome {
  return {
    tone: 'info',
    title: 'Lo estamos revisando',
    body: reviewDueAt
      ? `Te respondemos antes del ${formatDateTime(reviewDueAt)}.`
      : 'Te respondemos en las próximas 24 horas hábiles.',
    notes: codes.map((code) => userFacingCheckCopy[code]).filter((text): text is string => Boolean(text)),
    actions: [{ key: 'portal', label: 'Ir a mi panel', available: true }],
    handle,
  };
}

export function kycOutcomeFromSubmit(result: KycSubmitResult): KycOutcome {
  return result.status === 'AUTO_APPROVED'
    ? published(result.handle, result.postReviewDueAt, false)
    : inReview(result.reviewDueAt, result.userFacingCodes, result.handle);
}

/** The status screen of a later visit; `handle` comes from `GET /business/me`. */
export function kycOutcomeFromState(state: KycState, handle: string | null): KycOutcome {
  const submission = state.submission;
  const status = submission?.status ?? state.kycStatus;
  if (state.accountStatus === 'SUSPENDED' || status === 'SUSPENDED') {
    return {
      tone: 'danger',
      title: 'Tu negocio está suspendido',
      body: 'No se ve en REPP mientras dure la suspensión. Te escribimos por correo con el motivo.',
      notes: state.lastDecision?.reasons ?? [],
      actions: [],
      handle,
    };
  }
  if (status === 'AUTO_APPROVED' || status === 'APPROVED') {
    const outcome = published(handle, submission?.postReviewDueAt ?? null, state.badge === 'VERIFIED');
    return { ...outcome, actions: [...outcome.actions, { key: 'startChange', label: 'Cambiar datos del negocio', available: true }] };
  }
  if (status === 'REJECTED') return rejected(state, handle);
  if (status === 'SUBMITTED' || status === 'IN_REVIEW') {
    const changing = submission?.purpose === 'MATERIAL_CHANGE';
    const outcome = inReview(submission?.reviewDueAt ?? null, changing ? ['MATERIAL_CHANGE'] : [], handle);
    return changing ? { ...outcome, title: 'Estamos revisando tu cambio', body: `${outcome.body} Tu ficha sigue como estaba.` } : outcome;
  }
  return inReview(null, [], handle);
}

function rejected(state: KycState, handle: string | null): KycOutcome {
  const decision = state.lastDecision;
  const reasons = decision?.reasons ?? [];
  const changing = state.submission?.purpose === 'MATERIAL_CHANGE';
  if (changing) {
    return {
      tone: 'warning',
      title: 'No aprobamos tu cambio',
      body: 'Tu ficha sigue publicada con los datos de antes.',
      notes: reasons,
      actions: [{ key: 'startChange', label: 'Pedir otro cambio', available: true }],
      handle,
    };
  }
  if (!decision?.allowResubmit || (!state.attempts.canResubmit && !state.attempts.resubmitAvailableAt)) {
    return {
      tone: 'danger',
      title: 'No pudimos verificar tu negocio',
      body: 'Esta solicitud no se puede volver a enviar. Si crees que es un error, escríbenos a soporte.',
      notes: reasons,
      actions: [],
      handle,
    };
  }
  const waiting = !state.attempts.canResubmit && state.attempts.resubmitAvailableAt;
  return {
    tone: 'warning',
    title: 'Falta corregir algo',
    body: waiting
      ? `Podrás volver a enviarla desde el ${formatDateTime(state.attempts.resubmitAvailableAt)}.`
      : `Corrige lo que te pedimos y vuelve a enviarla. Intento ${state.attempts.used} de ${state.attempts.max}.`,
    notes: reasons,
    actions: [{ key: 'resubmit', label: 'Corregir y volver a enviar', available: !waiting, ...(waiting ? { hint: 'Todavía no' } : {}) }],
    handle,
  };
}
