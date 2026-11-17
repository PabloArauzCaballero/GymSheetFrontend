import { z } from 'zod';

/**
 * The "Conocer" profile: Tinder-style questions answered in an optional
 * onboarding step. Mirrors `/me/social-profile`, `/social/catalog/interests`
 * and `/me/discovery/readiness` in the backend.
 */

/** What someone is looking for. `UNSURE` ("Aún no lo sé") is only valid alone. */
export const discoveryIntents = ['TRAINING', 'FRIENDSHIP', 'DATING', 'UNSURE'] as const;
export type DiscoveryIntent = (typeof discoveryIntents)[number];

/** Same rule as the backend: `UNSURE` cannot be combined with another intent. */
export const discoveryIntentsSchema = z
  .array(z.enum(discoveryIntents))
  .min(1)
  .max(3)
  .refine((intents) => !intents.includes('UNSURE') || intents.length === 1, {
    message: '«Aún no lo sé» no se combina con otra opción.',
  })
  .refine((intents) => new Set(intents).size === intents.length, {
    message: 'No repitas opciones.',
  });

export const orientations = [
  'HETEROSEXUAL',
  'GAY',
  'LESBIAN',
  'BISEXUAL',
  'ASEXUAL',
  'DEMISEXUAL',
  'PANSEXUAL',
  'QUEER',
  'QUESTIONING',
] as const;
export type Orientation = (typeof orientations)[number];

export const drinkingHabits = ['NEVER', 'SOCIALLY', 'OFTEN'] as const;
export const smokingHabits = ['NEVER', 'SOMETIMES', 'OFTEN'] as const;
export const petOptions = ['NONE', 'DOG', 'CAT', 'OTHER', 'WANTS'] as const;
export type DrinkingHabit = (typeof drinkingHabits)[number];
export type SmokingHabit = (typeof smokingHabits)[number];
export type PetOption = (typeof petOptions)[number];

export const SOCIAL_BIO_MAX = 500;
export const SOCIAL_INTERESTS_MAX = 5;

export const interestCatalogEntrySchema = z.object({ code: z.string(), label: z.string() });
export type InterestCatalogEntry = z.infer<typeof interestCatalogEntrySchema>;

export const socialProfileSchema = z.object({
  configured: z.boolean(),
  orientation: z.enum(orientations).nullable(),
  orientationVisible: z.boolean(),
  interests: z.array(z.string()),
  drinking: z.enum(drinkingHabits).nullable(),
  smoking: z.enum(smokingHabits).nullable(),
  pets: z.enum(petOptions).nullable(),
  bio: z.string().nullable(),
  version: z.number().int().nonnegative(),
});
export type SocialProfile = z.infer<typeof socialProfileSchema>;

/** PUT replaces the whole profile: a field left out is cleared. */
export const updateSocialProfileSchema = z.object({
  orientation: z.enum(orientations).nullable().optional(),
  orientationVisible: z.boolean().optional(),
  interests: z
    .array(z.string())
    .max(SOCIAL_INTERESTS_MAX, `Elige hasta ${SOCIAL_INTERESTS_MAX} intereses.`)
    .optional(),
  drinking: z.enum(drinkingHabits).nullable().optional(),
  smoking: z.enum(smokingHabits).nullable().optional(),
  pets: z.enum(petOptions).nullable().optional(),
  bio: z
    .string()
    .trim()
    .max(SOCIAL_BIO_MAX, `La bio tiene un máximo de ${SOCIAL_BIO_MAX} caracteres.`)
    .nullable()
    .optional(),
  expectedVersion: z.number().int().nonnegative(),
});
export type UpdateSocialProfileInput = z.infer<typeof updateSocialProfileSchema>;

/**
 * What another member's card shows about them. `orientation` is present only
 * when its owner made it visible.
 */
export const socialAboutSchema = z.object({
  interests: z.array(z.string()),
  drinking: z.enum(drinkingHabits).nullable(),
  smoking: z.enum(smokingHabits).nullable(),
  pets: z.enum(petOptions).nullable(),
  bio: z.string().nullable(),
  orientation: z.enum(orientations).optional(),
});
export type SocialAbout = z.infer<typeof socialAboutSchema>;

/** Known readiness codes, in the order the backend checks them. */
export const discoveryReadinessCodes = ['EMAIL_VERIFICATION', 'PROFILE_ENABLED', 'PREFERENCES', 'PHOTOS'] as const;
export type DiscoveryReadinessCode = (typeof discoveryReadinessCodes)[number];

/** Unknown codes (added by a newer backend) are kept as strings and ignored by the UI. */
export const discoveryReadinessSchema = z.object({
  ready: z.boolean(),
  missing: z.array(z.string()),
});
export type DiscoveryReadiness = z.infer<typeof discoveryReadinessSchema>;

export const onboardingSocialSteps = ['PENDING', 'DONE', 'SKIPPED'] as const;
export type OnboardingSocialStep = (typeof onboardingSocialSteps)[number];
