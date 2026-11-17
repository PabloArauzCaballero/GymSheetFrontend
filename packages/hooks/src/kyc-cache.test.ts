import { describe, expect, it } from 'vitest';
import type { KycState } from '@gymsheet/schemas';
import { withDocument, withoutDocument, withPhone, withSelfieConsent } from './kyc-cache';

const doc = (id: string, kind: string) => ({ id, kind, readable: true, readabilityCodes: [], width: 1000, height: 800, uploadedAt: '2026-11-16T10:00:00.000Z' });

const state = {
  kycStatus: 'DRAFT',
  accountStatus: 'ONBOARDING',
  badge: null,
  submission: {
    id: 's1',
    version: 1,
    purpose: 'INITIAL',
    status: 'DRAFT',
    legalKind: 'COMPANY',
    fields: {} as never,
    documents: [doc('a', 'CI_FRONT')],
    selfieChallenge: { code: 'THUMB_UP', instruction: 'Pulgar', expiresAt: '2026-11-16T10:15:00.000Z' },
    submittedAt: null,
    decidedAt: null,
    reviewDueAt: null,
    postReviewDueAt: null,
  },
  missing: [],
  phone: null,
  consent: { kind: 'KYC_SELFIE', granted: false, upToDate: false, currentVersion: '2026-11-16' },
  attempts: { used: 0, max: 3, resubmitAvailableAt: null, canResubmit: false },
  lastDecision: null,
} satisfies KycState;

describe('KYC cache updates', () => {
  it('replaces a document of the same kind and drops the used gesture', () => {
    const next = withDocument(withDocument(state, doc('b', 'CI_FRONT')), doc('c', 'SELFIE'));
    expect(next?.submission?.documents.map((entry) => entry.id)).toEqual(['b', 'c']);
    expect(next?.submission?.selfieChallenge).toBeNull();
    expect(withoutDocument(next, 'b')?.submission?.documents.map((entry) => entry.id)).toEqual(['c']);
  });

  it('records the phone and the consent, and leaves an empty cache alone', () => {
    expect(withPhone(state, { phoneMasked: '+591 •••••567', verified: false, verifiedAt: null })?.phone?.phoneMasked).toBe('+591 •••••567');
    expect(withSelfieConsent(state)?.consent).toMatchObject({ granted: true, upToDate: true });
    expect(withDocument(undefined, doc('x', 'CI_BACK'))).toBeUndefined();
  });
});
