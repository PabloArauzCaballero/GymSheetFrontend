import { z } from 'zod';

/**
 * Franja 3 contracts: signup protection, email verification, devices and
 * Google/Apple sign-in. Mirror the backend's auth and antibot modules.
 */

/** `GET /auth/register/ticket`: signed, single-use form ticket. Fetch it when the form opens. */
export const registerTicketSchema = z.object({ ticket: z.string(), issuedAt: z.string() });
export type RegisterTicket = z.infer<typeof registerTicketSchema>;

/** `GET /auth/attestation/challenge`: nonce for Play Integrity / App Attest. */
export const attestationChallengeSchema = z.object({ nonce: z.string() });

/** Optional anti-automation fields of `POST /auth/register`. */
export const signupProtectionFieldsSchema = z.object({
  ticket: z.string().optional(),
  /** Honeypot: humans never fill it. */
  website: z.string().optional(),
  turnstileToken: z.string().optional(),
  attestation: z
    .object({ platform: z.enum(['ios', 'android']), token: z.string(), nonce: z.string() })
    .optional(),
});
export type SignupProtectionFields = z.infer<typeof signupProtectionFieldsSchema>;

/** `POST /auth/email/verify/confirm` body. */
export const emailPinSchema = z.object({
  pin: z.string().trim().regex(/^\d{6}$/u, 'El código son seis dígitos.'),
});
export type EmailPinInput = z.infer<typeof emailPinSchema>;

export const emailVerifyConfirmResponseSchema = z.object({ verified: z.literal(true) });

/** One device of the account (`GET /me/devices`). `current` = the device making the request. */
export const userDeviceSchema = z.object({
  id: z.string().uuid(),
  platform: z.enum(['WEB', 'IOS', 'ANDROID', 'UNKNOWN']),
  osVersion: z.string().nullable(),
  appVersion: z.string().nullable(),
  deviceModel: z.string().nullable(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  current: z.boolean(),
});
export type UserDevice = z.infer<typeof userDeviceSchema>;
export const userDevicesSchema = z.array(userDeviceSchema);

/** Result of `POST /auth/google` / `/auth/apple` when the person still has to complete the profile. */
export const identityProfileCompletionSchema = z.object({
  status: z.literal('PROFILE_COMPLETION_REQUIRED'),
  signupToken: z.string(),
  email: z.string(),
});
export type IdentityProfileCompletion = z.infer<typeof identityProfileCompletionSchema>;

/** `POST /auth/{google|apple}/complete` body (the session token comes back like a normal login). */
export const identityCompletionPayloadSchema = z.object({
  signupToken: z.string(),
  nombreCompleto: z.string().trim().min(3).max(180),
  fechaNacimiento: z.string(),
  genero: z.enum(['MALE', 'FEMALE']),
  termsVersion: z.string().trim().min(1).max(20),
  acceptedTerms: z.literal(true),
});
export type IdentityCompletionPayload = z.infer<typeof identityCompletionPayloadSchema>;

/** Stable backend codes of this franja. */
export const EMAIL_VERIFICATION_REQUIRED = 'EMAIL_VERIFICATION_REQUIRED';
export const SIGNUP_REJECTED = 'SIGNUP_REJECTED';
export const EMAIL_PIN_INVALID = 'EMAIL_PIN_INVALID';
export const EMAIL_PIN_EXPIRED = 'EMAIL_PIN_EXPIRED';
export const EMAIL_PIN_EXHAUSTED = 'EMAIL_PIN_EXHAUSTED';
export const EMAIL_PIN_COOLDOWN = 'EMAIL_PIN_COOLDOWN';
export const IDENTITY_EMAIL_UNVERIFIED = 'IDENTITY_EMAIL_UNVERIFIED';
export const SIGNUP_TOKEN_INVALID = 'SIGNUP_TOKEN_INVALID';
