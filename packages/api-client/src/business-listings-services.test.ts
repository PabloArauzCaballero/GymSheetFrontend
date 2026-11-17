import { describe, expect, it } from 'vitest';
import { businessMeSchema, moderationCaseContentSchema, publicBusinessProfileSchema, publicListingSchema } from '@gymsheet/schemas';
import { createApiClient } from './client';
import { createAdminListingsServices, createBusinessListingsServices, createPublicMarketplaceServices } from './business-listings-services';

const ID = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';
const ENTITY = '4e0b2a6c-1f3d-4b8a-9c2e-7d6f5a4b3c21';

const own = {
  id: ID,
  offerKind: 'MEMBERSHIP',
  name: 'Mensual',
  description: 'Acceso libre.',
  benefits: [],
  price: '250.00',
  currency: 'BOB',
  validityDays: 30,
  sessionsCount: null,
  stockQuantity: null,
  stockReserved: 0,
  productCategoryId: null,
  displayOrder: 0,
  mediaUrls: [],
  status: 'ACTIVE',
  moderationStatus: 'LIVE',
  moderationReasonCode: null,
  autoCheckCodes: [],
  visibility: 'PUBLIC',
  publishedAt: '2026-11-17T10:00:00.000Z',
  createdAt: '2026-11-17T10:00:00.000Z',
  updatedAt: '2026-11-17T10:00:00.000Z',
};
const location = {
  id: ID,
  name: 'Centro',
  address: null,
  city: 'La Paz',
  latitude: null,
  longitude: null,
  businessHours: {},
  displayOrder: 0,
  createdAt: '2026-11-17T10:00:00.000Z',
  updatedAt: '2026-11-17T10:00:00.000Z',
};
const publicListing = {
  id: ID,
  offerKind: 'PRODUCT',
  name: 'Whey 2 kg',
  description: 'Proteína.',
  benefits: [],
  price: '420.00',
  currency: 'BOB',
  validityDays: null,
  sessionsCount: null,
  inStock: true,
  productCategory: null,
  mediaUrls: [],
  publishedAt: '2026-11-17T10:00:00.000Z',
  seller: { id: ENTITY, name: 'Tienda', handle: 'tienda', entityType: 'STORE', logoUrl: null, city: 'La Paz', badge: 'NEW' },
};

type Call = { url: string; method: string; body: unknown };

function recordingClient(answer: (url: string, method: string) => unknown) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const method = init.method ?? 'GET';
    calls.push({ url: url.replace('https://api.test', ''), method, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
    if (method === 'DELETE' && url.includes('/locations/')) return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ ok: true, data: answer(url, method) }), { status: 200 });
  }) as typeof fetch;
  return { calls, client: createApiClient({ baseUrl: 'https://api.test', fetchImpl }) };
}

describe('listing schemas', () => {
  it('parses a public listing without moderation state or stock numbers', () => {
    const parsed = publicListingSchema.parse({ ...publicListing, moderationStatus: 'LIVE', stockQuantity: 9 });
    expect(parsed).not.toHaveProperty('moderationStatus');
    expect(parsed).not.toHaveProperty('stockQuantity');
    expect(publicListingSchema.safeParse({ ...publicListing, seller: { ...publicListing.seller, badge: 'GOLD' } }).success).toBe(false);
  });
  it('parses a profile or its redirect', () => {
    expect('redirectTo' in publicBusinessProfileSchema.parse({ redirectTo: 'nuevo' })).toBe(true);
    expect(publicBusinessProfileSchema.safeParse({ handle: 'x', locations: [] }).success).toBe(false);
  });
  it('parses the marketplace case content and the gallery of /business/me', () => {
    const content = moderationCaseContentSchema.parse({
      kind: 'BUSINESS_LISTING',
      name: 'Mensual',
      description: 'x',
      benefits: [],
      offerKind: 'MEMBERSHIP',
      price: '250.00',
      currency: 'BOB',
      validityDays: 30,
      sessionsCount: null,
      mediaUrls: [],
      status: 'ACTIVE',
      moderationStatus: 'LIVE',
      seller: { entityId: ENTITY, name: 'Top', handle: null },
    });
    expect(content.kind).toBe('BUSINESS_LISTING');
    expect(businessMeSchema.shape.entity.shape.gallery.parse(undefined)).toEqual([]);
  });
});

describe('createBusinessListingsServices', () => {
  it('calls every own-listing and location route with a strict body', async () => {
    const { calls, client } = recordingClient((url) => (url.includes('/locations') ? location : url.endsWith('/listings?limit=50') ? { items: [own], nextCursor: null } : own));
    const listings = createBusinessListingsServices(client.request, client.upload);
    await listings.list();
    await listings.create({
      offerKind: 'MEMBERSHIP',
      name: 'Mensual',
      description: 'Acceso libre.',
      benefits: [],
      price: 250,
      validityDays: 30,
      sessionsCount: null,
      stockQuantity: null,
      productCategoryId: null,
    });
    await listings.changePrice(ID, 260);
    await listings.changeStock(ID, null);
    await listings.pause(ID);
    await listings.removePhoto(ID, 2);
    await listings.createLocation({ name: 'Centro', city: 'La Paz', address: null, latitude: null, longitude: null, businessHours: {} });
    await listings.deleteLocation(ID);
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET /business/me/listings?limit=50',
      'POST /business/me/listings',
      `PATCH /business/me/listings/${ID}/price`,
      `PATCH /business/me/listings/${ID}/stock`,
      `POST /business/me/listings/${ID}/pause`,
      `DELETE /business/me/listings/${ID}/media/2`,
      'POST /business/me/locations',
      `DELETE /business/me/locations/${ID}`,
    ]);
    expect(calls[1]?.body).not.toHaveProperty('currency');
    expect(calls[2]?.body).toEqual({ price: 260 });
  });
  it('refuses a body the backend would reject before sending it', () => {
    const { client } = recordingClient(() => own);
    const listings = createBusinessListingsServices(client.request, client.upload);
    expect(() =>
      listings.createLocation({ name: 'C', city: 'La Paz', address: null, latitude: 1, longitude: null, businessHours: {} }),
    ).toThrow();
  });
});

describe('public and admin marketplace services', () => {
  it('searches, opens a profile by @handle and reports', async () => {
    const { calls, client } = recordingClient((url, method) =>
      method === 'POST' ? { id: ID, status: 'PENDIENTE', contentHidden: false } : url.includes('/profiles/') ? { redirectTo: 'nuevo' } : { items: [publicListing], nextCursor: null },
    );
    const market = createPublicMarketplaceServices(client.request);
    expect((await market.search('q=whey&limit=24')).items).toHaveLength(1);
    expect(await market.profile('@topfit')).toEqual({ redirectTo: 'nuevo' });
    await market.report({ targetKind: 'BUSINESS_LISTING', targetId: ID, reason: 'SPAM' });
    expect(calls.map((call) => call.url)).toEqual(['/public/directory/listings?q=whey&limit=24', '/public/directory/profiles/topfit', '/me/reports']);
  });
  it('lists, releases and rejects in REPP console; the review stamp round-trips with its microseconds', async () => {
    const stamp = '2026-11-17T01:01:00.738123Z';
    const held = {
      id: ID,
      entityId: ENTITY,
      sellerName: 'Top',
      sellerHandle: null,
      offerKind: 'DAY_PASS',
      name: 'Pase',
      description: 'Una visita.',
      benefits: [],
      mediaUrls: [],
      price: '30.00',
      currency: 'BOB',
      validityDays: null,
      sessionsCount: null,
      stockQuantity: null,
      productCategoryId: null,
      moderationStatus: 'HIDDEN',
      moderationReasonCode: null,
      autoCheckCodes: [],
      updatedAt: stamp,
    };
    const { calls, client } = recordingClient((url) =>
      url.endsWith('/release') ? { id: ID, moderationStatus: 'LIVE' } : url.endsWith('/reject') ? { id: ID, moderationStatus: 'REJECTED', reasonCode: 'DUPLICATE' } : { items: [held], nextCursor: null },
    );
    const admin = createAdminListingsServices(client.request);
    const page = await admin.list('HIDDEN');
    expect(page.items[0]?.updatedAt).toBe(stamp);
    await admin.release(ID, { seenUpdatedAt: page.items[0]!.updatedAt });
    await admin.reject(ID, 'DUPLICATE', 'Igual a otra');
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET /admin/business/listings?moderationStatus=HIDDEN&limit=50',
      `POST /admin/business/listings/${ID}/release`,
      `POST /admin/business/listings/${ID}/reject`,
    ]);
    expect(calls[1]?.body).toEqual({ seenUpdatedAt: stamp });
    expect(calls[2]?.body).toEqual({ reasonCode: 'DUPLICATE', note: 'Igual a otra' });
  });
});
