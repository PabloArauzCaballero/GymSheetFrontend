import { z } from 'zod';
import { authLimits, loginSchema } from '../forms';
import { signupProtectionFieldsSchema } from './account-security';
import { directoryEntityDetailSchema, entityTypeEnum } from './directory';
import { legalDocumentVersionSchema } from './legal';

/**
 * Business accounts (backend ADR-0020, franja 8a): signup, the account shell
 * (`GET /business/me`) and the public `@handle` namespace. Mirrors
 * `src/modules/business-accounts` of the backend.
 */

export const accountKindSchema = z.enum(['PERSON', 'BUSINESS']);
export const legalKindSchema = z.enum(['COMPANY', 'INDIVIDUAL']);
export type LegalKind = z.infer<typeof legalKindSchema>;

export const businessAccountStatusSchema = z.enum(['ONBOARDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']);
/** KYC arrives in franja 8b; until then every account is DRAFT. Open so 8b values do not break parsing. */
export const kycStatusSchema = z.string();

export const businessLimits = { nameMin: 2, nameMax: 180, cityMin: 2, cityMax: 100 } as const;

/** One accepted document: the whole set of `/legal/current?accountKind=BUSINESS` goes. */
export const businessAcceptanceSchema = legalDocumentVersionSchema.extend({
  contentSha256: z.string().regex(/^[0-9a-f]{64}$/u).optional(),
});
export type BusinessAcceptance = z.infer<typeof businessAcceptanceSchema>;

/** `POST /business/signup` body (the web BFF adds nothing; the mobile adds attestation). */
export const businessSignupPayloadSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(authLimits.emailMax),
    password: z.string().min(authLimits.passwordMin).max(authLimits.passwordMax),
    businessName: z.string().trim().min(businessLimits.nameMin).max(businessLimits.nameMax),
    entityType: entityTypeEnum,
    /** Only SERVICE_PROVIDER chooses; the backend fixes it for the other types. */
    legalKind: legalKindSchema.optional(),
    acceptances: z.array(businessAcceptanceSchema).min(1).max(5),
  })
  .extend(signupProtectionFieldsSchema.shape);
export type BusinessSignupPayload = z.infer<typeof businessSignupPayloadSchema>;

/** Step 1 of the wizard: what the person types. */
export const businessAccountFormSchema = z.object({
  email: loginSchema.shape.email,
  password: loginSchema.shape.password,
  acceptedTerms: z.boolean().refine(Boolean, { message: 'Marca la casilla para crear tu cuenta de negocio.' }),
});
export type BusinessAccountForm = z.infer<typeof businessAccountFormSchema>;

export const businessSummarySchema = z.object({
  entityId: z.string().uuid(),
  entityType: entityTypeEnum,
  legalKind: legalKindSchema,
  status: businessAccountStatusSchema,
  kycStatus: kycStatusSchema,
});
export type BusinessSummary = z.infer<typeof businessSummarySchema>;

/** The session part of `POST /business/signup` (201), as the backend answers it. */
export const businessSessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  nombreCompleto: z.string(),
  rol: z.string(),
  tenantId: z.string().nullable().optional(),
  emailVerified: z.boolean().optional(),
  accountKind: accountKindSchema.optional(),
});

export const businessSignupResponseSchema = z.object({
  accessToken: z.string().min(20),
  refreshToken: z.string().optional(),
  tokenType: z.string().optional(),
  user: businessSessionUserSchema,
  business: businessSummarySchema,
});
export type BusinessSignupResponse = z.infer<typeof businessSignupResponseSchema>;

export const businessNextSteps = ['VERIFY_EMAIL', 'CHOOSE_HANDLE', 'COMPLETE_PROFILE', 'SUBMIT_KYC'] as const;
export const businessNextStepSchema = z.enum(businessNextSteps);
export type BusinessNextStep = z.infer<typeof businessNextStepSchema>;

export const handleStatusSchema = z.enum(['PENDING', 'ACTIVE']);
/** `PUT /business/me/handle` and `GET /business/me` `handle`. */
export const currentHandleSchema = z.object({ handle: z.string(), status: handleStatusSchema });
export type CurrentHandle = z.infer<typeof currentHandleSchema>;

const hours = z.object({ open: z.string(), close: z.string() });

export const businessMeSchema = z.object({
  account: businessSummarySchema.extend({
    userId: z.string().uuid(),
    email: z.string(),
    emailVerified: z.boolean(),
    accountKind: z.literal('BUSINESS'),
    createdAt: z.string(),
  }),
  entity: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    entityType: entityTypeEnum,
    status: z.string(),
    isVerified: z.boolean(),
    name: z.string(),
    headline: z.string().nullable(),
    description: z.string(),
    primaryCategoryId: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    address: z.string().nullable(),
    isOnlineOnly: z.boolean(),
    logoUrl: z.string().nullable(),
    coverUrl: z.string().nullable(),
    contactInfo: z.record(z.string(), z.string()),
    businessHours: z.record(z.string(), hours),
  }),
  handle: currentHandleSchema.nullable(),
  // Unknown future steps are dropped instead of failing the whole shell.
  nextSteps: z.array(z.string()).transform((steps) =>
    steps.filter((step): step is BusinessNextStep => businessNextStepSchema.safeParse(step).success),
  ),
});
export type BusinessMe = z.infer<typeof businessMeSchema>;

/** Step 3 of the wizard («Tu negocio»): the four fields. */
export const businessProfileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(businessLimits.nameMin, 'Escribe el nombre de tu negocio.')
    .max(businessLimits.nameMax, 'El nombre es demasiado largo.'),
  handle: z.string().trim().min(1, 'Elige tu @usuario.'),
  primaryCategoryId: z.string().uuid('Elige una categoría.'),
  city: z
    .string()
    .trim()
    .min(businessLimits.cityMin, 'Escribe tu ciudad.')
    .max(businessLimits.cityMax, 'La ciudad es demasiado larga.'),
});
export type BusinessProfileForm = z.infer<typeof businessProfileFormSchema>;

/** `PATCH /business/me/profile`: any non-empty subset (unknown keys are a 400). */
export const businessProfilePatchSchema = z
  .object({
    name: businessProfileFormSchema.shape.name,
    headline: z.string().trim().max(255).nullable(),
    description: z.string().trim().max(5000),
    primaryCategoryId: z.string().uuid(),
    city: businessProfileFormSchema.shape.city,
    country: z.string().trim().min(2).max(60),
    address: z.string().trim().max(500).nullable(),
    isOnlineOnly: z.boolean(),
  })
  .partial()
  .strict();
export type BusinessProfilePatch = z.infer<typeof businessProfilePatchSchema>;

export const handleAvailabilityReasonSchema = z.enum(['TAKEN', 'RESERVED', 'INVALID', 'TOO_SIMILAR']);
export type HandleAvailabilityReason = z.infer<typeof handleAvailabilityReasonSchema>;

/** `GET /public/handles/:handle/availability`. `handle` is the normalized form (null when not ASCII). */
export const handleAvailabilitySchema = z.object({
  handle: z.string().nullable(),
  available: z.boolean(),
  reason: handleAvailabilityReasonSchema.nullable(),
});
export type HandleAvailability = z.infer<typeof handleAvailabilitySchema>;

/** `GET /public/handles/:handle`: the public listing, or where a renamed handle went. 404 otherwise. */
export const handleResolutionSchema = z.union([
  z.object({ handle: z.string(), entity: directoryEntityDetailSchema }),
  z.object({ redirectTo: z.string() }),
]);
export type HandleResolution = z.infer<typeof handleResolutionSchema>;

/** Stable backend codes of the business flows. */
export const BUSINESS_SIGNUP_DISABLED = 'BUSINESS_SIGNUP_DISABLED';
export const BUSINESS_LEGAL_KIND_INVALID = 'BUSINESS_LEGAL_KIND_INVALID';
export const BUSINESS_ACCOUNT_LOCKED = 'BUSINESS_ACCOUNT_LOCKED';
export const ACCOUNT_KIND_NOT_ALLOWED = 'ACCOUNT_KIND_NOT_ALLOWED';
export const EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED';
export const handleErrorCodes = [
  'HANDLE_TAKEN',
  'HANDLE_INVALID',
  'HANDLE_RESERVED',
  'HANDLE_TOO_SIMILAR',
  'HANDLE_RENAME_LIMIT',
] as const;
export type HandleErrorCode = (typeof handleErrorCodes)[number];
