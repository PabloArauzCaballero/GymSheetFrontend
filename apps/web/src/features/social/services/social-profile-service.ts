import { queryKeys } from '@/shared/api/query-keys';
import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  DiscoveryReadiness,
  InterestCatalogEntry,
  SocialProfile,
  UpdateSocialProfileInput,
} from '@/shared/api/schemas';
import {
  discoveryReadinessSchema,
  interestCatalogEntrySchema,
  socialProfileSchema,
} from '@/shared/api/schemas';

/**
 * Cache keys for the "Conocer" profile. They hang from `social` like the saved
 * discovery preferences, so one prefix invalidates everything Conocer shows.
 */
export const socialProfileKeys = {
  profile: queryKeys.socialProfile,
  interestCatalog: queryKeys.interestCatalog,
  readiness: queryKeys.discoveryReadiness,
};

/** The "Conocer" answers, the interest catalog and what still blocks appearing in the deck. */
export const socialProfileService = {
  get: () => apiRequest<SocialProfile>('/me/social-profile', socialProfileSchema),
  /** PUT replaces the whole profile: callers send every answer, not only the changed one. */
  update: (input: UpdateSocialProfileInput) =>
    apiRequest<SocialProfile>('/me/social-profile', socialProfileSchema, {
      method: 'PUT',
      body: input,
    }),
  interestCatalog: () =>
    apiRequest<InterestCatalogEntry[]>(
      '/social/catalog/interests',
      z.array(interestCatalogEntrySchema),
    ),
  readiness: () => apiRequest<DiscoveryReadiness>('/me/discovery/readiness', discoveryReadinessSchema),
};
