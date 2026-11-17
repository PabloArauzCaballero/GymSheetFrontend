import type { KycDocument, KycState, KycSubmission, PhoneState } from '@gymsheet/schemas';

/**
 * Cache updates of `GET /business/me/kyc` after each wizard write, shared by
 * web and mobile (pure, ADR-008: no react-query here). Each write answers
 * with the piece it changed, so the wizard moves on without a second read;
 * the caller still invalidates the key to re-read `missing[]`.
 */

/** The draft saved by `PUT kyc/draft` (the first save creates it). */
export function withSubmission(state: KycState | undefined, submission: KycSubmission): KycState | undefined {
  return state ? { ...state, submission } : state;
}

/** A document just uploaded: it replaces the one of the same kind, as on the server. */
export function withDocument(state: KycState | undefined, document: KycDocument): KycState | undefined {
  const submission = state?.submission;
  if (!state || !submission) return state;
  const documents = [...submission.documents.filter((entry) => entry.kind !== document.kind), document];
  // A selfie uses its gesture: the server drops the challenge at once.
  const selfieChallenge = document.kind === 'SELFIE' ? null : submission.selfieChallenge;
  return { ...state, submission: { ...submission, documents, selfieChallenge } };
}

export function withoutDocument(state: KycState | undefined, documentId: string): KycState | undefined {
  const submission = state?.submission;
  if (!state || !submission) return state;
  return { ...state, submission: { ...submission, documents: submission.documents.filter((entry) => entry.id !== documentId) } };
}

export function withPhone(state: KycState | undefined, phone: PhoneState): KycState | undefined {
  return state ? { ...state, phone } : state;
}

export function withSelfieConsent(state: KycState | undefined): KycState | undefined {
  return state ? { ...state, consent: { ...state.consent, granted: true, upToDate: true } } : state;
}

export function withSelfieChallenge(state: KycState | undefined, challenge: KycSubmission['selfieChallenge']): KycState | undefined {
  const submission = state?.submission;
  if (!state || !submission) return state;
  return { ...state, submission: { ...submission, selfieChallenge: challenge } };
}
