import { describe, expect, it } from 'vitest';
import type { KycState, KycSubmission } from '@gymsheet/schemas';
import {
  documentVerdict,
  documentsComplete,
  kycDocumentSlots,
  kycImageProblem,
  kycLegalParts,
  kycPlace,
  legalPartForMissing,
  stepForMissing,
} from './business-kyc';
import { kycFailure } from './business-kyc-errors';
import { kycOutcomeFromState, kycOutcomeFromSubmit } from './business-kyc-result';
import { approveDecision, kycReviewRefusal, rejectInputOf } from './business-kyc-review';
import { kycBanner, businessNextStepCopy } from './business-onboarding';

const fields = {
  tradeName: null,
  primaryCategoryId: null,
  legalName: null,
  nitMasked: null,
  repFullName: null,
  repCiMasked: null,
  repCiComplement: null,
  repCiExtension: null,
  specialty: null,
  address: null,
  seprecNumber: null,
  phoneMasked: null,
};

function submission(patch: Partial<KycSubmission> = {}): KycSubmission {
  return {
    id: 's1',
    version: 1,
    purpose: 'INITIAL',
    status: 'DRAFT',
    legalKind: 'COMPANY',
    fields,
    documents: [],
    selfieChallenge: null,
    submittedAt: null,
    decidedAt: null,
    reviewDueAt: null,
    postReviewDueAt: null,
    ...patch,
  };
}

function state(patch: Partial<KycState> = {}): KycState {
  return {
    kycStatus: 'DRAFT',
    accountStatus: 'ONBOARDING',
    badge: null,
    submission: null,
    missing: [],
    phone: null,
    consent: { kind: 'KYC_SELFIE', granted: false, upToDate: false, currentVersion: '2026-11-16' },
    attempts: { used: 0, max: 3, resubmitAvailableAt: null, canResubmit: false },
    lastDecision: null,
    ...patch,
  };
}

const phone = { phoneMasked: '+591 •••••567', verified: false, verifiedAt: null };
const doc = (kind: string, readable = true) => ({
  id: kind,
  kind,
  readable,
  readabilityCodes: readable ? [] : ['TOO_DARK'],
  width: 1200,
  height: 900,
  uploadedAt: '2026-11-16T10:00:00.000Z',
});

describe('kycPlace: where the wizard resumes', () => {
  it('starts at the phone, then the legal data before any draft exists', () => {
    expect(kycPlace(state())).toEqual({ kind: 'wizard', step: 4 });
    expect(kycPlace(state({ phone }))).toEqual({ kind: 'wizard', step: 5 });
  });

  it('follows the earliest missing datum of a draft, with its legal part', () => {
    const draft = submission();
    expect(kycPlace(state({ phone, submission: draft, missing: ['NIT', 'DOCUMENT_SELFIE'] }))).toEqual({ kind: 'wizard', step: 5, part: 'company' });
    expect(kycPlace(state({ phone, submission: draft, missing: ['REP_CI', 'LOGO'] }))).toEqual({ kind: 'wizard', step: 5, part: 'representative' });
    expect(kycPlace(state({ phone, submission: draft, missing: ['DOCUMENT_CI_BACK'] }))).toEqual({ kind: 'wizard', step: 6 });
    expect(kycPlace(state({ phone, submission: draft, missing: ['PHONE', 'NIT'] }))).toEqual({ kind: 'wizard', step: 4 });
    expect(kycPlace(state({ phone, submission: draft, missing: [] }))).toEqual({ kind: 'wizard', step: 7 });
  });

  it('opens a material change at the data, and anything sent at the result', () => {
    expect(kycPlace(state({ kycStatus: 'APPROVED', phone, submission: submission({ purpose: 'MATERIAL_CHANGE' }) }))).toEqual({ kind: 'wizard', step: 5 });
    expect(kycPlace(state({ kycStatus: 'IN_REVIEW', phone, submission: submission({ status: 'IN_REVIEW' }) }))).toEqual({ kind: 'result' });
    expect(kycPlace(state({ kycStatus: 'REJECTED', phone, submission: submission({ status: 'REJECTED' }) }))).toEqual({ kind: 'result' });
  });

  it('maps a 422 KYC_INCOMPLETE list to its step', () => {
    expect(stepForMissing(['LOGO', 'CITY'])).toBe(3);
    expect(stepForMissing(['UNKNOWN'])).toBeNull();
    expect(legalPartForMissing('INDIVIDUAL', ['SPECIALTY'])).toBe('person');
  });
});

describe('legal parts and documents', () => {
  it('keeps every screen at four fields or fewer', () => {
    expect(kycLegalParts('COMPANY', 'INITIAL')).toEqual(['company', 'representative']);
    expect(kycLegalParts('INDIVIDUAL', 'INITIAL')).toEqual(['person']);
    expect(kycLegalParts('COMPANY', 'MATERIAL_CHANGE')).toEqual(['business', 'company', 'representative']);
  });

  it('asks a company for its logo and an optional SEPREC, never an individual', () => {
    expect(kycDocumentSlots('COMPANY').map((slot) => `${slot.key}:${slot.required}`)).toEqual([
      'CI_FRONT:true',
      'CI_BACK:true',
      'SELFIE:true',
      'LOGO:true',
      'SEPREC:false',
    ]);
    expect(kycDocumentSlots('INDIVIDUAL').map((slot) => slot.key)).toEqual(['CI_FRONT', 'CI_BACK', 'SELFIE']);
  });

  it('lets step 6 go with every required photo, readable or not', () => {
    const docs = [doc('CI_FRONT'), doc('CI_BACK', false), doc('SELFIE')];
    expect(documentsComplete('COMPANY', docs, false)).toBe(false);
    expect(documentsComplete('COMPANY', docs, true)).toBe(true);
    expect(documentsComplete('INDIVIDUAL', docs.slice(0, 2), false)).toBe(false);
  });

  it('says «Legible ✓» or why to take it again', () => {
    expect(documentVerdict(doc('CI_FRONT'))).toEqual({ readable: true, label: 'Legible ✓', reason: null });
    expect(documentVerdict(doc('CI_FRONT', false))).toEqual({ readable: false, label: 'Vuelve a tomarla', reason: 'Está muy oscura. Busca más luz.' });
    expect(documentVerdict({ readable: false, readabilityCodes: [] }).reason).toMatch(/No pudimos abrir/u);
  });

  it('refuses HEIC with the fix, and anything over 8 MB', () => {
    expect(kycImageProblem({ type: 'image/heic', size: 10 })).toMatch(/Usa JPG o PNG/u);
    expect(kycImageProblem({ type: 'application/pdf', size: 10 })).toBe('Usa una foto JPG o PNG.');
    expect(kycImageProblem({ type: 'image/jpeg', size: 9 * 1024 * 1024 })).toMatch(/8 MB/u);
    expect(kycImageProblem({ type: 'image/png', size: 10 })).toBeNull();
  });
});

describe('kycFailure', () => {
  const api = (code: string, status: number, details: Record<string, unknown> = {}) => ({ code, status, details });

  it('puts field errors next to their field', () => {
    expect(kycFailure(api('KYC_FIELD_INVALID', 422, { field: 'nit', reason: 'FORMAT' }))).toMatchObject({ field: 'nit', message: expect.stringMatching(/7 a 13/u) });
    expect(kycFailure(api('PHONE_OTP_INVALID', 400, { attemptsLeft: 2 }))).toMatchObject({ field: 'code', message: 'El código no es correcto. Te quedan 2 intentos.' });
    expect(kycFailure(api('PHONE_INVALID', 400)).field).toBe('phone');
  });

  it('says what to do when the attempt cannot be edited', () => {
    expect(kycFailure(api('KYC_NOT_EDITABLE', 409, { action: 'CHANGE' })).next).toBe('startChange');
    expect(kycFailure(api('KYC_NOT_EDITABLE', 409, { action: 'WAIT' })).next).toBe('wait');
    expect(kycFailure(api('BUSINESS_MATERIAL_CHANGE_REQUIRES_REVIEW', 409, { action: 'POST /business/me/kyc/changes' })).next).toBe('startChange');
  });

  it('carries the missing list of an incomplete submit', () => {
    expect(kycFailure(api('KYC_INCOMPLETE', 422, { missing: ['NIT', 3] })).missing).toEqual(['NIT']);
  });

  it('falls back to the generic message for anything else', () => {
    expect(kycFailure(new Error('boom'))).toEqual({ code: null, message: 'No pudimos guardar. Inténtalo de nuevo.' });
    expect(kycFailure(api('KYC_DOCUMENT_UNSUPPORTED', 413)).message).toMatch(/8 MB/u);
  });
});

describe('result screen', () => {
  it('publishes an automatic approval with its post-review note and no dead links', () => {
    const outcome = kycOutcomeFromSubmit({ submissionId: 's1', status: 'AUTO_APPROVED', reviewDueAt: null, postReviewDueAt: null, userFacingCodes: [], handle: 'topfit' });
    expect(outcome.title).toBe('¡Listo! Tu negocio ya está publicado en @topfit');
    expect(outcome.body).toMatch(/72 horas/u);
    // The first listing has its screen since franja 8c and QR payments since 8d: nothing waits.
    expect(outcome.actions.filter((action) => !action.available)).toEqual([]);
    expect(outcome.actions.find((action) => action.key === 'qrPayments')?.available).toBe(true);
    expect(outcome.actions.find((action) => action.key === 'firstListing')?.available).toBe(true);
  });

  it('sends to review naming only user-facing checks', () => {
    const outcome = kycOutcomeFromSubmit({ submissionId: 's1', status: 'IN_REVIEW', reviewDueAt: null, postReviewDueAt: null, userFacingCodes: ['PHONE_VERIFIED', 'BLOCKLIST'], handle: 'topfit' });
    expect(outcome.title).toBe('Lo estamos revisando');
    expect(outcome.notes).toEqual(['Confirmamos tu teléfono a mano.']);
  });

  it('offers the resubmit only when the decision allows it and the cooldown passed', () => {
    const decision = { decision: 'REJECT', reasonCodes: ['NIT_INVALID'], reasons: ['No pudimos confirmar el NIT.'], allowResubmit: true, decidedAt: '2026-11-16T10:00:00.000Z' };
    const rejected = submission({ status: 'REJECTED' });
    const ready = kycOutcomeFromState(state({ kycStatus: 'REJECTED', submission: rejected, lastDecision: decision, attempts: { used: 1, max: 3, resubmitAvailableAt: null, canResubmit: true } }), 'topfit');
    expect(ready.actions).toEqual([{ key: 'resubmit', label: 'Corregir y volver a enviar', available: true }]);
    expect(ready.notes).toEqual(['No pudimos confirmar el NIT.']);
    const waiting = kycOutcomeFromState(
      state({ kycStatus: 'REJECTED', submission: rejected, lastDecision: decision, attempts: { used: 1, max: 3, resubmitAvailableAt: '2026-11-17T10:00:00.000Z', canResubmit: false } }),
      'topfit',
    );
    expect(waiting.actions[0]?.available).toBe(false);
    const final = kycOutcomeFromState(state({ kycStatus: 'REJECTED', submission: rejected, lastDecision: { ...decision, allowResubmit: false } }), null);
    expect(final.actions).toEqual([]);
  });

  it('lets an approved business ask for a material change', () => {
    const outcome = kycOutcomeFromState(state({ kycStatus: 'APPROVED', badge: 'VERIFIED', submission: submission({ status: 'APPROVED' }) }), 'topfit');
    expect(outcome.body).toMatch(/Verificado por REPP/u);
    expect(outcome.actions.map((action) => action.key)).toContain('startChange');
  });
});

describe('home banner and console helpers', () => {
  it('words every KYC status and turns the KYC step on', () => {
    expect(kycBanner('AUTO_APPROVED').tone).toBe('success');
    expect(kycBanner('REJECTED').tone).toBe('danger');
    expect(kycBanner('APPROVED', 'SUSPENDED').text).toMatch(/suspendido/u);
    expect(businessNextStepCopy.SUBMIT_KYC.available).toBe(true);
  });

  it('closes a post-review instead of approving twice, and builds a rejection', () => {
    expect(approveDecision('AUTO_APPROVED')).toBe('POST_REVIEW_OK');
    expect(approveDecision('IN_REVIEW')).toBe('APPROVE');
    expect(rejectInputOf(['NIT_INVALID'], true, '  ')).toEqual({ decision: 'REJECT', reasonCodes: ['NIT_INVALID'], allowResubmit: true });
    expect(kycReviewRefusal('KYC_CLAIMED_BY_OTHER')).toMatch(/Otra persona/u);
    expect(kycReviewRefusal('X')).toBeNull();
  });
});
