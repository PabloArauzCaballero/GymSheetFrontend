import { z } from 'zod';
import { directoryEntityDetailSchema } from './directory';

/**
 * Business listings, locations, gallery and the public marketplace (backend
 * ADR-0022, franja 8c). Mirrors `src/modules/business-listings` of the backend:
 * `listings.mapper.ts`, `business-locations.service.ts` and
 * `business-listings.schemas.ts`. Prices are strings in BOB ("250.00").
 */

export const offerKinds = [
  'MEMBERSHIP',
  'DAY_PASS',
  'MULTI_DAY_PASS',
  'CLASS_PACK',
  'SERVICE_SESSION',
  'SERVICE_PACK',
  'PRODUCT',
] as const;
export const offerKindSchema = z.enum(offerKinds);
export type OfferKind = z.infer<typeof offerKindSchema>;

export const listingVisibilities = [
  'PUBLIC',
  'BUSINESS_NOT_PUBLIC',
  'PAUSED',
  'ARCHIVED',
  'UNDER_REVIEW',
  'HIDDEN_BY_REPP',
  'REJECTED_BY_REPP',
] as const;
export const listingVisibilitySchema = z.enum(listingVisibilities);
export type ListingVisibility = z.infer<typeof listingVisibilitySchema>;

export const listingStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export type ListingStatus = z.infer<typeof listingStatusSchema>;
export const listingModerationStatusSchema = z.enum(['LIVE', 'HELD', 'HIDDEN', 'REJECTED']);
export type ListingModerationStatus = z.infer<typeof listingModerationStatusSchema>;

const nullableInt = z.number().int().nullable();

/** `Listing` of `business/me/listings*`: the seller's own view, with its moderation state. */
export const ownListingSchema = z.object({
  id: z.string().uuid(),
  offerKind: offerKindSchema,
  name: z.string(),
  description: z.string(),
  benefits: z.array(z.string()),
  price: z.string(),
  currency: z.string(),
  validityDays: nullableInt,
  sessionsCount: nullableInt,
  stockQuantity: nullableInt,
  stockReserved: z.number().int(),
  productCategoryId: z.string().nullable(),
  displayOrder: z.number().int(),
  mediaUrls: z.array(z.string()),
  status: listingStatusSchema,
  moderationStatus: listingModerationStatusSchema,
  moderationReasonCode: z.string().nullable(),
  autoCheckCodes: z.array(z.string()),
  visibility: listingVisibilitySchema,
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OwnListing = z.infer<typeof ownListingSchema>;

export const ownListingsPageSchema = z.object({ items: z.array(ownListingSchema), nextCursor: z.string().nullable() });
export type OwnListingsPage = z.infer<typeof ownListingsPageSchema>;

export const listingLimits = {
  nameMin: 2,
  nameMax: 180,
  descriptionMin: 5,
  descriptionMax: 5000,
  benefitMax: 200,
  benefitsMax: 20,
  priceMax: 10_000_000,
  validityMax: 3650,
  sessionsMax: 1000,
  stockMax: 1_000_000,
  mediaMax: 10,
  galleryMax: 10,
  locationsMax: 50,
} as const;

const twoDecimals = (value: number) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6;
const priceSchema = z.number().min(0).max(listingLimits.priceMax).refine(twoDecimals, 'Usa como máximo dos decimales.');

/** `POST /business/me/listings` body (strict on the server: currency and moderation are never sent). */
export const createListingInputSchema = z
  .object({
    offerKind: offerKindSchema,
    name: z.string().trim().min(listingLimits.nameMin).max(listingLimits.nameMax),
    description: z.string().trim().min(listingLimits.descriptionMin).max(listingLimits.descriptionMax),
    benefits: z.array(z.string().trim().min(1).max(listingLimits.benefitMax)).max(listingLimits.benefitsMax),
    price: priceSchema,
    validityDays: z.number().int().min(1).max(listingLimits.validityMax).nullable(),
    sessionsCount: z.number().int().min(1).max(listingLimits.sessionsMax).nullable(),
    stockQuantity: z.number().int().min(0).max(listingLimits.stockMax).nullable(),
    productCategoryId: z.string().uuid().nullable(),
  })
  .strict();
export type CreateListingInput = z.infer<typeof createListingInputSchema>;

/** `PATCH /business/me/listings/:id`: the kind never changes; price and stock have their own routes. */
export const updateListingInputSchema = createListingInputSchema
  .omit({ offerKind: true, price: true, stockQuantity: true })
  .partial()
  .strict();
export type UpdateListingInput = z.infer<typeof updateListingInputSchema>;

export const listingPriceInputSchema = z.object({ price: priceSchema, reason: z.string().trim().max(500).optional() }).strict();
export type ListingPriceInput = z.infer<typeof listingPriceInputSchema>;

const hoursSchema = z.record(z.string(), z.object({ open: z.string(), close: z.string() }));

/** A location of the business (`business/me/locations*`); the public profile drops the order and dates. */
export const publicLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  businessHours: hoursSchema,
});
export type PublicLocation = z.infer<typeof publicLocationSchema>;

export const businessLocationSchema = publicLocationSchema.extend({
  displayOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BusinessLocation = z.infer<typeof businessLocationSchema>;

export const locationInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(100),
    address: z.string().trim().max(500).nullable(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    businessHours: z.partialRecord(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']), z.object({ open: z.string(), close: z.string() })),
  })
  .strict()
  .refine((value) => (value.latitude === null) === (value.longitude === null), {
    message: 'Escribe la latitud y la longitud juntas.',
    path: ['latitude'],
  });
export type LocationInput = z.infer<typeof locationInputSchema>;

/** `POST /business/me/gallery`, `DELETE /business/me/gallery/:position`. */
export const businessGallerySchema = z.object({ gallery: z.array(z.string()) });
export type BusinessGallery = z.infer<typeof businessGallerySchema>;

export const sellerBadgeSchema = z.enum(['VERIFIED', 'NEW']);
export type SellerBadge = z.infer<typeof sellerBadgeSchema>;

/** What anyone sees of a listing: no moderation state, stock numbers, owner or tenant. */
export const publicListingSchema = z.object({
  id: z.string().uuid(),
  offerKind: offerKindSchema,
  name: z.string(),
  description: z.string(),
  benefits: z.array(z.string()),
  price: z.string(),
  currency: z.string(),
  validityDays: nullableInt,
  sessionsCount: nullableInt,
  inStock: z.boolean().nullable(),
  productCategory: z.object({ id: z.string(), name: z.string(), path: z.string() }).nullable(),
  mediaUrls: z.array(z.string()),
  publishedAt: z.string(),
  seller: z.object({
    id: z.string().uuid(),
    name: z.string(),
    handle: z.string().nullable(),
    entityType: z.string(),
    logoUrl: z.string().nullable(),
    city: z.string().nullable(),
    badge: sellerBadgeSchema,
  }),
});
export type PublicListing = z.infer<typeof publicListingSchema>;

export const publicListingsPageSchema = z.object({ items: z.array(publicListingSchema), nextCursor: z.string().nullable() });
export type PublicListingsPage = z.infer<typeof publicListingsPageSchema>;

/** `GET /public/directory/profiles/:handle`: the profile, or where a renamed handle went (404 otherwise). */
export const publicBusinessProfileSchema = z.union([
  z.object({
    handle: z.string(),
    entity: directoryEntityDetailSchema,
    locations: z.array(publicLocationSchema),
    listings: publicListingsPageSchema,
  }),
  z.object({ redirectTo: z.string() }),
]);
export type PublicBusinessProfileResult = z.infer<typeof publicBusinessProfileSchema>;
export type PublicBusinessProfile = Exclude<PublicBusinessProfileResult, { redirectTo: string }>;

/** REPP's console over listings that are not public by moderation (`GET /admin/business/listings`). */
export const adminListingSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().uuid(),
  sellerName: z.string(),
  sellerHandle: z.string().nullable(),
  offerKind: offerKindSchema,
  name: z.string(),
  description: z.string(),
  benefits: z.array(z.string()),
  mediaUrls: z.array(z.string()),
  price: z.string(),
  currency: z.string(),
  validityDays: nullableInt,
  sessionsCount: nullableInt,
  stockQuantity: nullableInt,
  productCategoryId: z.string().nullable(),
  moderationStatus: listingModerationStatusSchema,
  moderationReasonCode: z.string().nullable(),
  autoCheckCodes: z.array(z.string()),
  /**
   * Microsecond stamp ("2026-11-17T01:01:00.738123Z"): kept as the exact string
   * and sent back unchanged on release. A Date would drop the last 3 digits and
   * the backend would see a stale review (409 LISTING_CHANGED_SINCE_REVIEW).
   */
  updatedAt: z.string(),
});
export type AdminListing = z.infer<typeof adminListingSchema>;

export const adminListingsPageSchema = z.object({ items: z.array(adminListingSchema), nextCursor: z.string().nullable() });
export type AdminListingsPage = z.infer<typeof adminListingsPageSchema>;

export const adminListingFilters = ['HELD', 'HIDDEN', 'REJECTED'] as const;
export type AdminListingFilter = (typeof adminListingFilters)[number];

export const listingRejectionReasons = ['PROHIBITED_PRODUCT', 'MISLEADING', 'PRICE_ABUSE', 'DUPLICATE', 'OTHER'] as const;
export type ListingRejectionReason = (typeof listingRejectionReasons)[number];

export const adminListingReleaseResultSchema = z.object({ id: z.string().uuid(), moderationStatus: z.literal('LIVE') });
export const adminListingRejectResultSchema = z.object({
  id: z.string().uuid(),
  moderationStatus: z.literal('REJECTED'),
  reasonCode: z.enum(listingRejectionReasons),
});

/** Stable backend codes of the listings flows. */
export const listingErrorCodes = [
  'LISTING_SHAPE_INVALID',
  'LISTING_CATEGORY_INVALID',
  'LISTING_LIMIT',
  'LISTING_NOT_EDITABLE',
  'LISTING_SAME_PRICE',
  'LISTING_STOCK_BELOW_RESERVED',
  'LISTING_INVALID_TRANSITION',
  'LISTING_MEDIA_LIMIT',
  'LISTING_NOT_PUBLISHABLE',
  'LISTING_LOCKED_BY_REPP',
  'LISTING_CHANGED_SINCE_REVIEW',
  'LOCATION_NAME_TAKEN',
  'LOCATION_LIMIT',
  'BUSINESS_GALLERY_LIMIT',
] as const;
export type ListingErrorCode = (typeof listingErrorCodes)[number];
