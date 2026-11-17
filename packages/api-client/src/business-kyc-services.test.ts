import { describe, expect, it } from 'vitest';
import { kycAdminDetailSchema, kycStateSchema, kycSubmitResultSchema } from '@gymsheet/schemas';
import { createApiClient } from './client';
import { createBusinessKycAdminServices, createBusinessKycServices, kycDocumentPath } from './business-kyc-services';

const SUB = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';
const DOC = '4e0b2a6c-1f3d-4b8a-9c2e-7d6f5a4b3c21';

const fields = {
  tradeName: null,
  primaryCategoryId: null,
  legalName: 'Top Fitness SRL',
  nitMasked: '••••567',
  repFullName: 'Ana Rojas',
  repCiMasked: '•••321',
  repCiComplement: null,
  repCiExtension: 'SC',
  specialty: null,
  address: 'Av. Busch 123',
  seprecNumber: null,
  phoneMasked: null,
};
const submission = {
  id: SUB,
  version: 1,
  purpose: 'INITIAL',
  status: 'DRAFT',
  legalKind: 'COMPANY',
  fields,
  documents: [
    { id: DOC, kind: 'CI_FRONT', readable: false, readabilityCodes: ['TOO_SMALL'], width: 640, height: 480, uploadedAt: '2026-11-16T10:00:00.000Z' },
  ],
  selfieChallenge: null,
  submittedAt: null,
  decidedAt: null,
  reviewDueAt: null,
  postReviewDueAt: null,
};
const state = {
  kycStatus: 'DRAFT',
  accountStatus: 'ONBOARDING',
  badge: null,
  submission,
  missing: ['DOCUMENT_CI_BACK'],
  phone: { phoneMasked: '+591 •••••567', verified: false, verifiedAt: null },
  consent: { kind: 'KYC_SELFIE', granted: false, upToDate: false, currentVersion: '2026-11-16' },
  attempts: { used: 0, max: 3, resubmitAvailableAt: null, canResubmit: false },
  lastDecision: null,
};

function formFields(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  form.forEach((value, key) => {
    out[key] = typeof value === 'string' ? value : 'file';
  });
  return out;
}

type Call = { url: string; method: string; body: unknown; form?: Record<string, unknown> };

function recordingClient(answer: (url: string) => unknown) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const body = init.body;
    calls.push({
      url: url.replace('https://api.test', ''),
      method: init.method ?? 'GET',
      body: typeof body === 'string' ? JSON.parse(body) : undefined,
      form: body instanceof FormData ? formFields(body) : undefined,
    });
    if ((init.method ?? 'GET') === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ ok: true, data: answer(url) }), { status: 200 });
  }) as typeof fetch;
  return { calls, client: createApiClient({ baseUrl: 'https://api.test', fetchImpl }) };
}

describe('KYC schemas', () => {
  it('parses GET /business/me/kyc with the masked data only', () => {
    const parsed = kycStateSchema.parse(state);
    expect(parsed.submission?.fields.nitMasked).toBe('••••567');
    expect(parsed.submission?.documents[0]?.readable).toBe(false);
  });

  it('refuses a submit result with an unknown status', () => {
    const result = { submissionId: SUB, status: 'IN_REVIEW', reviewDueAt: '2026-11-17T10:00:00.000Z', postReviewDueAt: null, userFacingCodes: ['PHONE_VERIFIED'], handle: 'topfit' };
    expect(kycSubmitResultSchema.parse(result).status).toBe('IN_REVIEW');
    expect(kycSubmitResultSchema.safeParse({ ...result, status: 'APPROVED' }).success).toBe(false);
  });

  it('parses the console detail with the identity in clear', () => {
    const detail = kycAdminDetailSchema.parse({
      submission: { ...submission, status: 'IN_REVIEW' },
      identity: { nit: '1029384567', repCiNumber: '7654321', phone: '+59171234567' },
      phoneVerified: false,
      account: { id: SUB, email: 'top@negocio.bo', status: 'ONBOARDING', kycStatus: 'IN_REVIEW', entityType: 'GYM' },
      entity: { id: DOC, name: 'Top Fitness', status: 'DRAFT', isVerified: false, city: 'Santa Cruz', logoUrl: null },
      handle: { handle: 'topfit', skeleton: 'topflt', status: 'PENDING' },
      documents: [{ ...submission.documents[0], deleted: false, deleteReason: null, selfieChallengeCode: null }],
      checks: [{ code: 'PHONE_VERIFIED', outcome: 'FAIL', detail: { reason: 'NOT_VERIFIED' }, durationMs: 1, createdAt: '2026-11-16T10:00:00.000Z' }],
      decisions: [],
      history: [{ fromStatus: 'DRAFT', toStatus: 'SUBMITTED', actorUserId: SUB, at: '2026-11-16T10:00:00.000Z' }],
      claimedByUserId: null,
    });
    expect(detail.identity.nit).toBe('1029384567');
    expect(detail.handle?.handle).toBe('topfit');
  });
});

describe('createBusinessKycServices', () => {
  it('calls every wizard route with its body', async () => {
    const { calls, client } = recordingClient((url) => {
      if (url.endsWith('/verify/request')) return { phoneMasked: '+591 •••••567', codeSent: false, expiresAt: null };
      if (url.endsWith('/verify/confirm')) return { phoneMasked: '+591 •••••567', verified: true, verifiedAt: '2026-11-16T10:00:00.000Z' };
      if (url.endsWith('/kyc/draft')) return submission;
      if (url.endsWith('/kyc/consent')) return { kind: 'KYC_SELFIE', granted: true, version: '2026-11-16' };
      if (url.endsWith('/selfie-challenge')) return { code: 'THUMB_UP', instruction: 'Haz un pulgar arriba', expiresAt: '2026-11-16T10:15:00.000Z' };
      if (url.endsWith('/kyc/documents')) return submission.documents[0];
      if (url.endsWith('/me/media')) return { slot: 'LOGO', url: 'https://cdn.repp.app/logo.png' };
      if (url.endsWith('/kyc/submit')) return { submissionId: SUB, status: 'AUTO_APPROVED', reviewDueAt: null, postReviewDueAt: null, userFacingCodes: [], handle: 'topfit' };
      if (url.endsWith('/resubmit') || url.endsWith('/changes')) return { submissionId: SUB, version: 2 };
      return state;
    });
    const kyc = createBusinessKycServices(client.request, client.upload);

    await kyc.state();
    expect((await kyc.requestPhoneCode('71234567')).codeSent).toBe(false);
    await kyc.confirmPhoneCode('123456');
    await kyc.saveDraft({ nit: '1029384567' });
    await kyc.grantSelfieConsent('2026-11-16');
    await kyc.selfieChallenge();
    await kyc.uploadDocument('CI_FRONT', new FormData());
    await kyc.uploadLogo(new FormData());
    await expect(kyc.deleteDocument(DOC)).resolves.toBeNull();
    await kyc.submit();
    await kyc.resubmit();
    await kyc.startChange();

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET /business/me/kyc',
      'POST /business/me/phone/verify/request',
      'POST /business/me/phone/verify/confirm',
      'PUT /business/me/kyc/draft',
      'PUT /business/me/kyc/consent',
      'POST /business/me/kyc/selfie-challenge',
      'POST /business/me/kyc/documents',
      'POST /business/me/media',
      `DELETE /business/me/kyc/documents/${DOC}`,
      'POST /business/me/kyc/submit',
      'POST /business/me/kyc/resubmit',
      'POST /business/me/kyc/changes',
    ]);
    expect(calls[1]?.body).toEqual({ phone: '71234567' });
    expect(calls[4]?.body).toEqual({ granted: true, version: '2026-11-16' });
    expect(calls[6]?.form).toEqual({ kind: 'CI_FRONT' });
    expect(calls[7]?.form).toEqual({ slot: 'LOGO' });
  });

  it('erases the own KYC with the password and reads the suspension (ADR-0028)', async () => {
    const result = { status: 'SUSPENDED', suspensionReasonCode: 'KYC_MISSING', kycStatus: 'SUSPENDED', documentsErased: 4 };
    const { calls, client } = recordingClient(() => result);
    const kyc = createBusinessKycServices(client.request, client.upload);
    await expect(kyc.erase('secreta')).resolves.toEqual(result);
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/business/me/kyc/erase', body: { password: 'secreta' } });
    // An empty password never leaves the client: the backend would answer 400 anyway.
    expect(() => kyc.erase('')).toThrow();
  });
});

describe('createBusinessKycAdminServices', () => {
  it('builds the queue filter and refuses a rejection body the backend would refuse too', async () => {
    const { calls, client } = recordingClient(() => ({ items: [], nextCursor: null }));
    const admin = createBusinessKycAdminServices(client.request);
    await admin.queue({ queue: 'POST_REVIEW', overdue: true });
    expect(calls[0]?.url).toBe('/admin/business/kyc/queue?queue=POST_REVIEW&overdue=true&limit=50');
    expect(() => admin.decide(SUB, { decision: 'REJECT', reasonCodes: ['NOPE' as never] })).toThrow();
    expect(kycDocumentPath(SUB, DOC)).toBe(`/admin/business/kyc/${SUB}/documents/${DOC}`);
  });
});
