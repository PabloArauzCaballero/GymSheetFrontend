import { z } from 'zod';
import { gymDirectoryEntrySchema } from './social';

/**
 * Why the backend ranked a "Conocer" card where it is: the closed list of
 * `DISCOVERY_REASON_CODES` in the backend's `social.mapper.ts`.
 *
 * Activity ("training now", "active now") ranks the deck but is never sent:
 * telling a stranger someone is at the gym right now exposes their real-time
 * presence. It is deliberately absent here too.
 */
export const discoveryReasonCodes = [
  'NEARBY',
  'SAME_GOAL',
  'SAME_ROUTINE',
  'SHARED_INTERESTS',
  'VERIFIED',
  'NEW_HERE',
] as const;
export type DiscoveryReasonCode = (typeof discoveryReasonCodes)[number];

const isDiscoveryReasonCode = (code: string): code is DiscoveryReasonCode =>
  (discoveryReasonCodes as readonly string[]).includes(code);

/**
 * `GET /me/discovery/deck`: a directory entry plus its ranking context.
 *
 * Both fields are always sent. `reasons` keeps only known codes, as the
 * backend contract asks clients to ignore unknown ones; `distanceKm` is whole
 * kilometres, never below 1 (an exact location is never exposed), and `null`
 * when either side has no location.
 */
export const discoveryCardSchema = gymDirectoryEntrySchema.extend({
  reasons: z
    .array(z.string())
    .transform((codes) => [...new Set(codes.filter(isDiscoveryReasonCode))]),
  distanceKm: z.number().int().min(1).nullable(),
});
export type DiscoveryCard = z.infer<typeof discoveryCardSchema>;

export const discoveryDeckSchema = z.array(discoveryCardSchema);
