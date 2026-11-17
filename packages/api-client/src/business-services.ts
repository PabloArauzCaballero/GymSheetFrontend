import { z } from 'zod';
import {
  businessMeSchema,
  categoryTreeNodeSchema,
  currentHandleSchema,
  handleAvailabilitySchema,
  type BusinessProfilePatch,
  type EntityType,
} from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

/**
 * Business account calls (ADR-0020, franja 8a) for both apps: the web passes
 * its BFF `apiRequest`, the mobile its bearer client. The signup itself is not
 * here: on the web it must go through the BFF route that sets the HttpOnly
 * cookie, and on the mobile through the auth store that keeps the tokens.
 */
export function createBusinessServices(request: RequestFn) {
  return {
    me: () => request('/business/me', businessMeSchema, { method: 'GET' }),
    updateProfile: (patch: BusinessProfilePatch) =>
      request('/business/me/profile', businessMeSchema, { method: 'PATCH', body: patch }),
    claimHandle: (handle: string) =>
      request('/business/me/handle', currentHandleSchema, { method: 'PUT', body: { handle } }),
    handleAvailability: (handle: string, signal?: AbortSignal) =>
      request(`/public/handles/${encodeURIComponent(handle)}/availability`, handleAvailabilitySchema, {
        method: 'GET',
        signal,
      }),
    /** Categories a business of `type` may pick (`scope = type or ALL` on the server). */
    categories: (type: EntityType) =>
      request(`/public/directory/categories?scope=${encodeURIComponent(type)}`, z.array(categoryTreeNodeSchema), {
        method: 'GET',
      }),
  };
}

export type BusinessServices = ReturnType<typeof createBusinessServices>;
