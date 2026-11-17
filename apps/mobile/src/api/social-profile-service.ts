import { z } from 'zod';
import {
  discoveryReadinessSchema,
  interestCatalogEntrySchema,
  onboardingSchema,
  socialProfileSchema,
  type UpdateSocialProfileInput,
} from '@gymsheet/schemas';
import { apiClient } from './client';

/**
 * The "Conocer" profile: catalog of interests, the person's own answers, whether
 * they can appear in the deck, and the optional onboarding step. Kept apart from
 * `services.ts` so that file does not keep growing.
 */
export const socialProfileService = {
  interests: () =>
    apiClient.request('/social/catalog/interests', z.array(interestCatalogEntrySchema), { method: 'GET' }),
  get: () => apiClient.request('/me/social-profile', socialProfileSchema, { method: 'GET' }),
  /** Replaces the whole profile: a field left out is cleared. 409 when `expectedVersion` is stale. */
  update: (input: UpdateSocialProfileInput) =>
    apiClient.request('/me/social-profile', socialProfileSchema, { method: 'PUT', body: input }),
  readiness: () => apiClient.request('/me/discovery/readiness', discoveryReadinessSchema, { method: 'GET' }),
  /** Closes the optional onboarding step. Never changes the COMPLETED status. */
  finishOnboardingStep: (action: 'DONE' | 'SKIP') =>
    apiClient.request('/me/onboarding/social', onboardingSchema, { method: 'PUT', body: { action } }),
};
