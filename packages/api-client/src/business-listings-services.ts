import { z } from 'zod';
import {
  adminListingRejectResultSchema,
  adminListingReleaseResultSchema,
  adminListingsPageSchema,
  businessGallerySchema,
  businessLocationSchema,
  createListingInputSchema,
  listingPriceInputSchema,
  locationInputSchema,
  ownListingSchema,
  ownListingsPageSchema,
  publicBusinessProfileSchema,
  publicListingSchema,
  publicListingsPageSchema,
  updateListingInputSchema,
  type AdminListingFilter,
  type CreateListingInput,
  type ListingRejectionReason,
  type LocationInput,
  type UpdateListingInput,
} from '@gymsheet/schemas';
import type { UploadFn } from './business-kyc-services';
import type { RequestFn } from './routine-services';

const noContentSchema = z.null();
const UPLOAD_TIMEOUT_MS = 60_000;
const reportResultSchema = z.object({ id: z.string(), status: z.string(), contentHidden: z.boolean() });

const id = (value: string) => encodeURIComponent(value);

/**
 * The business's own listings, locations and gallery (ADR-0022, franja 8c).
 * NEGOCIO only: a person gets 403 ACCOUNT_KIND_NOT_ALLOWED. Every body is
 * parsed with the strict input schema first, so a stray key never reaches
 * the server (it would answer 400).
 */
export function createBusinessListingsServices(request: RequestFn, upload: UploadFn) {
  const listing = (listingId: string) => `/business/me/listings/${id(listingId)}`;
  return {
    list: (filter: { status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'; cursor?: string | null } = {}) => {
      const params = new URLSearchParams({ limit: '50' });
      if (filter.status) params.set('status', filter.status);
      if (filter.cursor) params.set('cursor', filter.cursor);
      return request(`/business/me/listings?${params.toString()}`, ownListingsPageSchema, { method: 'GET' });
    },
    get: (listingId: string) => request(listing(listingId), ownListingSchema, { method: 'GET' }),
    create: (input: CreateListingInput) =>
      request('/business/me/listings', ownListingSchema, { method: 'POST', body: createListingInputSchema.parse(input) }),
    update: (listingId: string, patch: UpdateListingInput) =>
      request(listing(listingId), ownListingSchema, { method: 'PATCH', body: updateListingInputSchema.parse(patch) }),
    changePrice: (listingId: string, price: number, reason?: string) =>
      request(`${listing(listingId)}/price`, ownListingSchema, {
        method: 'PATCH',
        body: listingPriceInputSchema.parse(reason ? { price, reason } : { price }),
      }),
    changeStock: (listingId: string, stockQuantity: number | null) =>
      request(`${listing(listingId)}/stock`, ownListingSchema, { method: 'PATCH', body: { stockQuantity } }),
    pause: (listingId: string) => request(`${listing(listingId)}/pause`, ownListingSchema, { method: 'POST' }),
    resume: (listingId: string) => request(`${listing(listingId)}/resume`, ownListingSchema, { method: 'POST' }),
    archive: (listingId: string) => request(`${listing(listingId)}/archive`, ownListingSchema, { method: 'POST' }),
    /** `form` carries the photo as `file` (JPEG/PNG, ≤ 10 per listing). */
    addPhoto: (listingId: string, form: FormData) =>
      upload(`${listing(listingId)}/media`, ownListingSchema, form, { timeoutMs: UPLOAD_TIMEOUT_MS }),
    removePhoto: (listingId: string, position: number) =>
      request(`${listing(listingId)}/media/${position}`, ownListingSchema, { method: 'DELETE' }),

    locations: () => request('/business/me/locations', z.array(businessLocationSchema), { method: 'GET' }),
    createLocation: (input: LocationInput) =>
      request('/business/me/locations', businessLocationSchema, { method: 'POST', body: locationInputSchema.parse(input) }),
    updateLocation: (locationId: string, input: LocationInput) =>
      request(`/business/me/locations/${id(locationId)}`, businessLocationSchema, {
        method: 'PATCH',
        body: locationInputSchema.parse(input),
      }),
    deleteLocation: (locationId: string) =>
      request(`/business/me/locations/${id(locationId)}`, noContentSchema, { method: 'DELETE' }),

    addGalleryPhoto: (form: FormData) =>
      upload('/business/me/gallery', businessGallerySchema, form, { timeoutMs: UPLOAD_TIMEOUT_MS }),
    removeGalleryPhoto: (position: number) =>
      request(`/business/me/gallery/${position}`, businessGallerySchema, { method: 'DELETE' }),
  };
}
export type BusinessListingsServices = ReturnType<typeof createBusinessListingsServices>;

/**
 * The public marketplace (no token needed): search, listing detail and the
 * business profile by `@handle`. `query` is built by `listingSearchParams`
 * of `@gymsheet/domain`, so web and mobile send the same keys.
 */
export function createPublicMarketplaceServices(request: RequestFn) {
  return {
    search: (query: string, signal?: AbortSignal) =>
      request(`/public/directory/listings${query ? `?${query}` : ''}`, publicListingsPageSchema, { method: 'GET', signal }),
    listing: (listingId: string) => request(`/public/directory/listings/${id(listingId)}`, publicListingSchema, { method: 'GET' }),
    profile: (handle: string) =>
      request(`/public/directory/profiles/${encodeURIComponent(handle.replace(/^@/u, ''))}`, publicBusinessProfileSchema, {
        method: 'GET',
      }),
    /** «⋯ Reportar» (person accounts): only a public listing or profile can be reported, else 404. */
    report: (input: { targetKind: 'BUSINESS_LISTING' | 'BUSINESS_PROFILE'; targetId: string; reason: string; details?: string }) =>
      request('/me/reports', reportResultSchema, { method: 'POST', body: input }),
  };
}
export type PublicMarketplaceServices = ReturnType<typeof createPublicMarketplaceServices>;

/** REPP's «Publicaciones» queue (MODERATOR, SYSTEM_ADMIN): held, hidden and rejected listings. */
export function createAdminListingsServices(request: RequestFn) {
  return {
    list: (moderationStatus: AdminListingFilter, cursor?: string | null) => {
      const params = new URLSearchParams({ moderationStatus, limit: '50' });
      if (cursor) params.set('cursor', cursor);
      return request(`/admin/business/listings?${params.toString()}`, adminListingsPageSchema, { method: 'GET' });
    },
    /**
     * Release carries the `updatedAt` the moderator saw: if the seller edited
     * the listing meanwhile the backend answers 409 LISTING_CHANGED_SINCE_REVIEW
     * and REPP never publishes content nobody looked at.
     */
    release: (listingId: string, seen: { seenUpdatedAt: string; note?: string }) =>
      request(`/admin/business/listings/${id(listingId)}/release`, adminListingReleaseResultSchema, {
        method: 'POST',
        body: seen.note ? { seenUpdatedAt: seen.seenUpdatedAt, note: seen.note } : { seenUpdatedAt: seen.seenUpdatedAt },
      }),
    reject: (listingId: string, reasonCode: ListingRejectionReason, note?: string) =>
      request(`/admin/business/listings/${id(listingId)}/reject`, adminListingRejectResultSchema, {
        method: 'POST',
        body: note ? { reasonCode, note } : { reasonCode },
      }),
  };
}
export type AdminListingsServices = ReturnType<typeof createAdminListingsServices>;
