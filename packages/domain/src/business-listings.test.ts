import { describe, expect, it } from 'vitest';
import {
  EMPTY_LISTING_FORM,
  LISTING_SHAPE,
  hasListingDetail,
  listingFormErrors,
  listingFormOf,
  listingPatch,
  listingPayload,
  listingTerms,
  offerKindsFor,
  parsePriceInput,
  splitBenefits,
  stepErrors,
  type ListingForm,
} from './business-listings';

const form = (patch: Partial<ListingForm>): ListingForm => ({
  ...EMPTY_LISTING_FORM,
  name: 'Mensual libre',
  description: 'Acceso ilimitado a la sala.',
  price: '250',
  ...patch,
});

describe('parsePriceInput', () => {
  it('reads bolivian and plain formats with at most two decimals', () => {
    expect(parsePriceInput('250')).toBe(250);
    expect(parsePriceInput('250,5')).toBe(250.5);
    expect(parsePriceInput('Bs 1.250,50')).toBe(1250.5);
    expect(parsePriceInput('1,250.50')).toBe(1250.5);
    expect(parsePriceInput('1.250')).toBe(1250);
  });
  it('refuses empty, negative, three decimals and over the cap', () => {
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('-5')).toBeNull();
    expect(parsePriceInput('abc')).toBeNull();
    expect(parsePriceInput('20000000')).toBeNull();
  });
});

describe('per-kind shape (mirror of the backend SHAPE_BY_KIND)', () => {
  it('requires validity for a membership and at least 2 days for a multi-day pass', () => {
    expect(listingFormErrors(form({ offerKind: 'MEMBERSHIP' })).validityDays).toBeDefined();
    expect(listingFormErrors(form({ offerKind: 'MEMBERSHIP', validityDays: '30' }))).toEqual({});
    expect(listingFormErrors(form({ offerKind: 'MULTI_DAY_PASS', validityDays: '1' })).validityDays).toContain('desde 2');
    expect(listingFormErrors(form({ offerKind: 'MULTI_DAY_PASS', validityDays: '3' }))).toEqual({});
  });
  it('requires sessions for packs and keeps their validity optional', () => {
    expect(listingFormErrors(form({ offerKind: 'CLASS_PACK' })).sessionsCount).toBeDefined();
    expect(listingFormErrors(form({ offerKind: 'SERVICE_PACK', sessionsCount: '10' }))).toEqual({});
    expect(listingFormErrors(form({ offerKind: 'CLASS_PACK', sessionsCount: '10', validityDays: 'x' })).validityDays).toBeDefined();
  });
  it('asks nothing extra of a day pass or a session, and validates product stock', () => {
    expect(hasListingDetail('DAY_PASS')).toBe(false);
    expect(hasListingDetail('SERVICE_SESSION')).toBe(false);
    expect(hasListingDetail('PRODUCT')).toBe(true);
    expect(listingFormErrors(form({ offerKind: 'PRODUCT', stockQuantity: 'muchos' })).stockQuantity).toBeDefined();
    expect(listingFormErrors(form({ offerKind: 'PRODUCT', stockQuantity: '' }))).toEqual({});
  });
  it('covers every kind the backend knows', () => {
    expect(Object.keys(LISTING_SHAPE).sort()).toEqual(
      ['CLASS_PACK', 'DAY_PASS', 'MEMBERSHIP', 'MULTI_DAY_PASS', 'PRODUCT', 'SERVICE_PACK', 'SERVICE_SESSION'],
    );
  });
});

describe('listingPayload', () => {
  it('sends forbidden fields as null so a kind never carries another kind data', () => {
    const payload = listingPayload(form({ offerKind: 'DAY_PASS', validityDays: '30', sessionsCount: '4', stockQuantity: '9' }));
    expect(payload).toMatchObject({ offerKind: 'DAY_PASS', price: 250, validityDays: null, sessionsCount: null, stockQuantity: null });
  });
  it('keeps stock and category of a product and the benefits list', () => {
    const payload = listingPayload(
      form({ offerKind: 'PRODUCT', stockQuantity: '12', productCategoryId: '4e0b2a6c-1f3d-4b8a-9c2e-7d6f5a4b3c21', benefits: '- Sabor vainilla\n\n• 2 kg' }),
    );
    expect(payload).toMatchObject({ stockQuantity: 12, benefits: ['Sabor vainilla', '2 kg'] });
    expect(payload?.productCategoryId).toBe('4e0b2a6c-1f3d-4b8a-9c2e-7d6f5a4b3c21');
  });
  it('is null while a field is wrong, and the patch drops kind, price and stock', () => {
    expect(listingPayload(form({ offerKind: 'MEMBERSHIP' }))).toBeNull();
    expect(listingPatch(form({ offerKind: 'MEMBERSHIP', validityDays: '30' }))).not.toHaveProperty('price');
  });
  it('round-trips an existing listing through the form', () => {
    const listing = {
      offerKind: 'CLASS_PACK' as const,
      name: '10 clases',
      description: 'Spinning o funcional.',
      benefits: ['Toalla'],
      price: '300.00',
      validityDays: 60,
      sessionsCount: 10,
      stockQuantity: null,
      productCategoryId: null,
    };
    expect(listingPayload(listingFormOf(listing))).toMatchObject({ price: 300, sessionsCount: 10, validityDays: 60, benefits: ['Toalla'] });
  });
});

describe('steps and copy', () => {
  it('reports only the fields of the current step', () => {
    expect(stepErrors({ ...EMPTY_LISTING_FORM, offerKind: 'MEMBERSHIP' }, 3)).toHaveProperty('name');
    expect(stepErrors({ ...EMPTY_LISTING_FORM, offerKind: 'MEMBERSHIP' }, 3)).not.toHaveProperty('validityDays');
    expect(stepErrors(EMPTY_LISTING_FORM, 1)).toHaveProperty('offerKind');
  });
  it('suggests the kinds of the business type first', () => {
    expect(offerKindsFor('STORE')[0]).toBe('PRODUCT');
    expect(offerKindsFor('GYM').slice(0, 1)).toEqual(['MEMBERSHIP']);
    expect(offerKindsFor(null)).toHaveLength(7);
  });
  it('says what a listing includes in one line', () => {
    expect(listingTerms({ offerKind: 'MEMBERSHIP', validityDays: 30, sessionsCount: null })).toBe('30 días');
    expect(listingTerms({ offerKind: 'CLASS_PACK', validityDays: 60, sessionsCount: 10 })).toBe('10 sesiones · vence a los 60 días');
    expect(listingTerms({ offerKind: 'PRODUCT', validityDays: null, sessionsCount: null, inStock: false })).toBe('Sin stock');
    expect(splitBenefits('a\nb')).toEqual(['a', 'b']);
  });
});
