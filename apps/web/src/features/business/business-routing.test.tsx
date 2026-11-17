import type { ReactElement } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BusinessMe, KycState } from '@/shared/api/schemas';

/**
 * Routing by account kind (ADR-0020): a business never renders the person
 * portal, a person never renders the business signup or portal, and a
 * signed-in business resumes the wizard where `nextSteps` says.
 */
const mocks = vi.hoisted(() => ({
  hasCookie: vi.fn(() => true),
  requireSession: vi.fn(),
  getBusinessMe: vi.fn(),
  getBusinessKyc: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`);
  }),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ has: mocks.hasCookie }) }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/shared/server/session', () => ({ requireSession: mocks.requireSession, BackendUnavailableError: Error }));
vi.mock('@/shared/server/business-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/server/business-session')>()),
  getBusinessMe: mocks.getBusinessMe,
  getBusinessKyc: mocks.getBusinessKyc,
  requireBusinessSession: async () => {
    const session = await mocks.requireSession();
    if (session.role !== 'NEGOCIO') mocks.redirect('/comunidad');
    return session;
  },
}));
vi.mock('@/shared/server/legal', () => ({ getPendingLegalDocuments: async () => [] }));
vi.mock('@/shared/server/impersonation', () => ({ impersonatedGym: async () => null }));

const business = { id: '00000000-0000-4000-8000-000000000001', email: 'top@negocio.bo', role: 'NEGOCIO', accountKind: 'BUSINESS' };
const person = { id: '00000000-0000-4000-8000-000000000002', email: 'ana@persona.bo', role: 'CLIENTE', accountKind: 'PERSON' };

function meWith(nextSteps: BusinessMe['nextSteps']): BusinessMe {
  return {
    account: {
      entityId: '00000000-0000-4000-8000-000000000003',
      entityType: 'GYM',
      legalKind: 'COMPANY',
      status: 'ONBOARDING',
      kycStatus: 'DRAFT',
      userId: business.id,
      email: business.email,
      emailVerified: !nextSteps.includes('VERIFY_EMAIL'),
      accountKind: 'BUSINESS',
      createdAt: '2026-11-16T10:00:00.000Z',
    },
    entity: {
      id: '00000000-0000-4000-8000-000000000003',
      slug: 'top',
      entityType: 'GYM',
      status: 'DRAFT',
      isVerified: false,
      name: 'Top Fitness',
      headline: null,
      description: '',
      primaryCategoryId: null,
      city: null,
      country: null,
      address: null,
      isOnlineOnly: false,
      logoUrl: null,
      coverUrl: null,
      contactInfo: {},
      businessHours: {},
      gallery: [],
    },
    handle: null,
    nextSteps,
  };
}

function kycWith(patch: Partial<KycState> = {}): KycState {
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

const draft = {
  id: '00000000-0000-4000-8000-000000000009',
  version: 1,
  purpose: 'INITIAL',
  status: 'DRAFT',
  legalKind: 'COMPANY' as const,
  fields: {
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
  },
  documents: [],
  selfieChallenge: null,
  submittedAt: null,
  decidedAt: null,
  reviewDueAt: null,
  postReviewDueAt: null,
};

type Page = () => Promise<ReactElement<{ start?: { step: number; email?: string; part?: string } }>>;
let signupPage: Page;
let homePage: Page;
let portalLayout: (props: { children: ReactElement }) => Promise<unknown>;

// The first import transforms the whole server module graph: on a loaded machine that takes long.
beforeAll(async () => {
  signupPage = (await import('@/app/negocio/registro/page')).default as unknown as Page;
  homePage = (await import('@/app/negocio/(panel)/page')).default as unknown as Page;
  portalLayout = (await import('@/app/(portal)/layout')).default as unknown as typeof portalLayout;
}, 90_000);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasCookie.mockReturnValue(true);
});

describe('/negocio/registro', () => {
  it('starts at «¿Qué eres?» without a session', async () => {
    mocks.hasCookie.mockReturnValue(false);
    expect((await signupPage()).props.start).toEqual({ step: 0 });
    expect(mocks.requireSession).not.toHaveBeenCalled();
  });

  it('sends a person to their own home', async () => {
    mocks.requireSession.mockResolvedValue(person);
    await expect(signupPage()).rejects.toThrow('REDIRECT /comunidad');
  });

  it('resumes a business at the email PIN, then at «Tu negocio»', async () => {
    mocks.requireSession.mockResolvedValue(business);
    mocks.getBusinessMe.mockResolvedValue(meWith(['VERIFY_EMAIL', 'CHOOSE_HANDLE', 'COMPLETE_PROFILE', 'SUBMIT_KYC']));
    expect((await signupPage()).props.start).toMatchObject({ step: 2, email: 'top@negocio.bo' });
    mocks.getBusinessMe.mockResolvedValue(meWith(['CHOOSE_HANDLE', 'SUBMIT_KYC']));
    expect((await signupPage()).props.start).toMatchObject({ step: 3 });
  });

  it('resumes a business that finished steps 0–3 at the exact KYC step', async () => {
    mocks.requireSession.mockResolvedValue(business);
    mocks.getBusinessMe.mockResolvedValue(meWith(['SUBMIT_KYC']));
    mocks.getBusinessKyc.mockResolvedValue(kycWith());
    expect((await signupPage()).props.start).toMatchObject({ step: 4, entityType: 'GYM' });
    const phone = { phoneMasked: '+591 •••••567', verified: false, verifiedAt: null };
    mocks.getBusinessKyc.mockResolvedValue(kycWith({ phone, submission: draft, missing: ['REP_CI', 'DOCUMENT_SELFIE'] }));
    expect((await signupPage()).props.start).toMatchObject({ step: 5, part: 'representative' });
  });

  it('sends a business with nothing left to edit to its KYC status', async () => {
    mocks.requireSession.mockResolvedValue(business);
    mocks.getBusinessMe.mockResolvedValue(meWith(['SUBMIT_KYC']));
    mocks.getBusinessKyc.mockResolvedValue(kycWith({ kycStatus: 'IN_REVIEW', submission: { ...draft, status: 'IN_REVIEW' } }));
    await expect(signupPage()).rejects.toThrow('REDIRECT /negocio/verificacion');
  });
});

describe('/negocio (Inicio)', () => {
  it('resumes the wizard while steps are missing', async () => {
    mocks.getBusinessMe.mockResolvedValue(meWith(['COMPLETE_PROFILE', 'SUBMIT_KYC']));
    await expect(homePage()).rejects.toThrow('REDIRECT /negocio/registro');
  });

  it('shows the home once the wizard is done', async () => {
    const me = meWith(['SUBMIT_KYC']);
    mocks.getBusinessMe.mockResolvedValue(me);
    expect((await homePage()).props).toMatchObject({ me });
  });
});

describe('person portal', () => {
  it('redirects a business session to /negocio before rendering any person page', async () => {
    mocks.requireSession.mockResolvedValue(business);
    await expect(portalLayout({ children: <div /> })).rejects.toThrow('REDIRECT /negocio');
  });

  it('renders for a person', async () => {
    mocks.requireSession.mockResolvedValue(person);
    await expect(portalLayout({ children: <div /> })).resolves.toBeTruthy();
  });

  it('treats an older backend without accountKind by its role', async () => {
    mocks.requireSession.mockResolvedValue({ ...business, accountKind: undefined });
    await expect(portalLayout({ children: <div /> })).rejects.toThrow('REDIRECT /negocio');
  });
});
