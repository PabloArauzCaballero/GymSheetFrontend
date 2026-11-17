import { describe, expect, it } from 'vitest';
import {
  businessMeSchema,
  businessSignupPayloadSchema,
  businessSignupResponseSchema,
  handleResolutionSchema,
  publicPaymentConfigSchema,
  sessionPrincipalSchema,
} from '@gymsheet/schemas';
import { createApiClient } from './client';
import { createBusinessServices } from './business-services';

const UUID = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';
const ENTITY = '4e0b2a6c-1f3d-4b8a-9c2e-7d6f5a4b3c21';

const me = {
  account: {
    entityId: ENTITY,
    entityType: 'GYM',
    legalKind: 'COMPANY',
    status: 'ONBOARDING',
    kycStatus: 'DRAFT',
    userId: UUID,
    email: 'top@negocio.bo',
    emailVerified: false,
    accountKind: 'BUSINESS',
    createdAt: '2026-11-16T10:00:00.000Z',
  },
  entity: {
    id: ENTITY,
    slug: 'top-fitness-abc',
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
  },
  handle: null,
  nextSteps: ['VERIFY_EMAIL', 'CHOOSE_HANDLE', 'COMPLETE_PROFILE', 'SUBMIT_KYC'],
};

describe('business schemas', () => {
  it('parses the signup answer: session plus the DRAFT business', () => {
    const parsed = businessSignupResponseSchema.parse({
      accessToken: 'a'.repeat(40),
      refreshToken: 'r'.repeat(40),
      tokenType: 'Bearer',
      user: { id: UUID, email: 'top@negocio.bo', nombreCompleto: 'Top Fitness', rol: 'NEGOCIO', tenantId: 'default', emailVerified: false, accountKind: 'BUSINESS' },
      business: { entityId: ENTITY, entityType: 'GYM', legalKind: 'COMPANY', status: 'ONBOARDING', kycStatus: 'DRAFT' },
    });
    expect(parsed.user.accountKind).toBe('BUSINESS');
    expect(parsed.business.kycStatus).toBe('DRAFT');
  });

  it('validates the signup payload like the backend', () => {
    const base = {
      email: 'top@negocio.bo',
      password: 'Negocio2026!',
      businessName: 'Top Fitness',
      entityType: 'GYM',
      acceptances: [{ document: 'BUSINESS_TERMS', version: '2026-11-16' }],
    };
    expect(businessSignupPayloadSchema.safeParse(base).success).toBe(true);
    expect(businessSignupPayloadSchema.safeParse({ ...base, password: 'corta' }).success).toBe(false);
    expect(businessSignupPayloadSchema.safeParse({ ...base, businessName: 'T' }).success).toBe(false);
    expect(businessSignupPayloadSchema.safeParse({ ...base, entityType: 'BAR' }).success).toBe(false);
    expect(businessSignupPayloadSchema.safeParse({ ...base, acceptances: [] }).success).toBe(false);
    expect(
      businessSignupPayloadSchema.safeParse({ ...base, acceptances: [{ document: 'BUSINESS_DPA', version: 'v', contentSha256: 'x' }] })
        .success,
    ).toBe(false);
  });

  it('parses /business/me and drops next steps it does not know', () => {
    const parsed = businessMeSchema.parse({ ...me, nextSteps: [...me.nextSteps, 'FUTURE_STEP'] });
    expect(parsed.nextSteps).toEqual(['VERIFY_EMAIL', 'CHOOSE_HANDLE', 'COMPLETE_PROFILE', 'SUBMIT_KYC']);
  });

  it('reads accountKind and businessEntityId on the session principal, absent on older backends', () => {
    const business = sessionPrincipalSchema.parse({ id: UUID, email: 'a@b.bo', role: 'NEGOCIO', accountKind: 'BUSINESS', businessEntityId: ENTITY });
    expect(business.accountKind).toBe('BUSINESS');
    const legacy = sessionPrincipalSchema.parse({ id: UUID, email: 'a@b.bo', role: 'CLIENTE' });
    expect(legacy.accountKind).toBeUndefined();
  });

  it('resolves a handle to a listing or a redirect', () => {
    expect('redirectTo' in handleResolutionSchema.parse({ redirectTo: 'topfit' })).toBe(true);
    expect(handleResolutionSchema.safeParse({ handle: 'topfit' }).success).toBe(false);
  });
});

describe('public payment config (franja 8a, D5)', () => {
  const config = {
    bankName: 'Banco Unión',
    accountHolderName: 'Top Fitness SRL',
    accountNumber: '1234-5678',
    aliasOrPhone: null,
    qrImageUrl: 'https://cdn.repp.app/qr.png',
    qrPayload: null,
    instructions: null,
    isActive: true,
  };

  it('parses the public shape without tax id, ids or dates', () => {
    expect(publicPaymentConfigSchema.parse(config).taxId).toBeUndefined();
  });

  it('accepts null when the seller has no active method', () => {
    expect(publicPaymentConfigSchema.nullable().parse(null)).toBeNull();
  });

  it('still parses an older backend that sends the tax id', () => {
    expect(publicPaymentConfigSchema.parse({ ...config, taxId: '1029384756', id: 'x' }).taxId).toBe('1029384756');
  });
});

describe('createBusinessServices', () => {
  it('calls the business and public handle routes', async () => {
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? 'GET', body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
      const data = url.includes('/availability')
        ? { handle: 'top.fit', available: true, reason: null }
        : url.endsWith('/handle')
          ? { handle: 'top.fit', status: 'PENDING' }
          : me;
      return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
    }) as typeof fetch;
    const client = createApiClient({ baseUrl: 'https://api.test/api/v1', fetchImpl });
    const business = createBusinessServices(client.request);

    await business.me();
    await business.claimHandle('@Top.Fit');
    const availability = await business.handleAvailability('top fit');
    await business.updateProfile({ city: 'Santa Cruz' });

    expect(availability.available).toBe(true);
    expect(calls.map((call) => `${call.method} ${call.url.replace('https://api.test/api/v1', '')}`)).toEqual([
      'GET /business/me',
      'PUT /business/me/handle',
      'GET /public/handles/top%20fit/availability',
      'PATCH /business/me/profile',
    ]);
    expect(calls[1]?.body).toEqual({ handle: '@Top.Fit' });
  });
});
