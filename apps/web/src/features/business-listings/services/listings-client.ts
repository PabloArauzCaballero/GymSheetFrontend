import { createAdminListingsServices, createBusinessListingsServices, createPublicMarketplaceServices } from '@gymsheet/api-client';
import { apiRequest, apiUpload } from '@/shared/api/api-client';

/** The business's listings, locations and gallery through the generic BFF (same services as the mobile). */
export const businessListingsService = createBusinessListingsServices(apiRequest, apiUpload);

/** The public marketplace through the BFF: its reads work without a session too (see the BFF policy). */
export const marketplaceService = createPublicMarketplaceServices(apiRequest);

/** REPP's «Publicaciones» queue; the backend answers 403 outside MODERATOR / SYSTEM_ADMIN. */
export const adminListingsService = createAdminListingsServices(apiRequest);

/** The photo as the multipart `file` part. */
export function photoForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}
