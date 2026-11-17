import { z } from 'zod';

/**
 * Franja 4 contracts: separate, revocable consents for sensitive data.
 * Mirrors the backend's `src/modules/consents` and `legal/consent-versions.ts`.
 */
export const consentKinds = ['HEALTH', 'ORIENTATION', 'VERIFICATION_SELFIE', 'PRECISE_LOCATION'] as const;
export type ConsentKind = (typeof consentKinds)[number];
export const consentKindSchema = z.enum(consentKinds);

/** One entry of `GET /me/consents` and the response of `PUT /me/consents/:kind`. */
export const consentSchema = z.object({
  kind: consentKindSchema,
  granted: z.boolean(),
  /** Version of the text the person agreed to; null if never granted. */
  version: z.string().nullable(),
  currentVersion: z.string(),
  /** False when granted to an older text: ask again. */
  upToDate: z.boolean(),
  grantedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
});
export type Consent = z.infer<typeof consentSchema>;

export const consentsResponseSchema = z.object({ consents: z.array(consentSchema) });
export type ConsentsResponse = z.infer<typeof consentsResponseSchema>;

/** `PUT /me/consents/:kind` body: granting names the version shown; revoking needs none. */
export const setConsentInputSchema = z.union([
  z.object({ granted: z.literal(true), version: z.string().trim().min(1).max(20) }),
  z.object({ granted: z.literal(false) }),
]);
export type SetConsentInput = z.infer<typeof setConsentInputSchema>;

/** Current version of one consent text, as `GET /legal/current` lists them. */
export const consentVersionSchema = z.object({ kind: consentKindSchema, version: z.string() });
export type ConsentVersion = z.infer<typeof consentVersionSchema>;

/** 400: the write needs a consent first; `details.kind` names it. */
export const CONSENT_REQUIRED = 'CONSENT_REQUIRED';
/** 409: the version sent is not the current text; `details.currentVersion` has it. */
export const CONSENT_VERSION_OUTDATED = 'CONSENT_VERSION_OUTDATED';
/** 403 on the social map: the viewer does not share, so they cannot see others. */
export const SOCIAL_MAP_DISABLED = 'SOCIAL_MAP_DISABLED';
