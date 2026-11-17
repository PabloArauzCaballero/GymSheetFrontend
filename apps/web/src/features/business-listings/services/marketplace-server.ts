import 'server-only';
import { cache } from 'react';
import { z } from 'zod';
import {
  publicBusinessProfileSchema,
  publicListingSchema,
  publicListingsPageSchema,
  type PublicBusinessProfile,
  type PublicListing,
  type PublicListingsPage,
} from '@/shared/api/schemas';
import { backendRequest, isBackendUnreachable, readBackendJson } from '@/shared/server/backend';
import { BackendUnavailableError } from '@/shared/server/session';

async function read<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  const response = await backendRequest(path);
  if (isBackendUnreachable(response)) throw new BackendUnavailableError();
  if (!response.ok) return null;
  const parsed = z.object({ ok: z.literal(true), data: schema }).safeParse(await readBackendJson(response));
  return parsed.success ? parsed.data.data : null;
}

export type ProfileResult = { kind: 'found'; profile: PublicBusinessProfile } | { kind: 'redirect'; to: string } | { kind: 'missing' };

/** `GET /public/directory/profiles/:handle`, server to server (public, no session), memoized per request. */
export const getPublicProfile = cache(async (handle: string): Promise<ProfileResult> => {
  const data = await read(`/public/directory/profiles/${encodeURIComponent(handle)}`, publicBusinessProfileSchema);
  if (!data) return { kind: 'missing' };
  return 'redirectTo' in data ? { kind: 'redirect', to: data.redirectTo } : { kind: 'found', profile: data };
});

/** One public listing; null when it is not public (held, hidden, paused or its business is not ACTIVE). */
export const getPublicListing = cache(
  (listingId: string): Promise<PublicListing | null> =>
    read(`/public/directory/listings/${encodeURIComponent(listingId)}`, publicListingSchema),
);

/** The first page of a search, rendered on the server so the marketplace is never empty on arrival. */
export async function searchPublicListings(query: string): Promise<PublicListingsPage | null> {
  return read(`/public/directory/listings?${query}`, publicListingsPageSchema);
}
