import { z } from 'zod';

/**
 * Affiliations to a gym (backend ADR-0025, franja 7b) and «Mi gimnasio» by
 * the confirmed SOCIO affiliation (ADR-0027, franja 7c). The gym is named by
 * its directory entity, never by the session's tenant.
 */
export const affiliationKinds = ['SOCIO', 'ENTRENADOR'] as const;
export const affiliationKindSchema = z.enum(affiliationKinds);
export type AffiliationKind = z.infer<typeof affiliationKindSchema>;

export const affiliationStatuses = ['REQUESTED', 'CONFIRMED', 'REJECTED', 'ENDED', 'CANCELLED'] as const;
export const affiliationStatusSchema = z.enum(affiliationStatuses);
export type AffiliationStatus = z.infer<typeof affiliationStatusSchema>;

/** The gym's chips: why it rejects a request, and why it ends a confirmed one. */
export const affiliationRejectReasons = ['UNKNOWN_PERSON', 'CI_MISMATCH', 'WRONG_LOCATION', 'NOT_A_COACH_HERE', 'OTHER'] as const;
export type AffiliationRejectReason = (typeof affiliationRejectReasons)[number];
export const affiliationEndReasons = ['NO_LONGER_MEMBER', 'NO_LONGER_COACH', 'CONDUCT', 'OTHER'] as const;
export type AffiliationEndReason = (typeof affiliationEndReasons)[number];

export const gymRefSchema = z.object({ id: z.string().uuid(), name: z.string(), handle: z.string().nullable(), logoUrl: z.string().nullable() });
export type GymRef = z.infer<typeof gymRefSchema>;

const locationRefSchema = z.object({ id: z.string().uuid(), name: z.string() });

/** What the person (or the coach business) reads of their own affiliation. */
export const affiliationSchema = z.object({
  id: z.string().uuid(),
  kind: affiliationKindSchema,
  status: affiliationStatusSchema,
  gym: gymRefSchema,
  location: locationRefSchema.nullable(),
  /** The digits the person typed; null for a coach and on every closed row. */
  ciLast3: z.string().nullable(),
  replacesAffiliationId: z.string().uuid().nullable(),
  reasonCode: z.string().nullable(),
  reasonNote: z.string().nullable(),
  requestedAt: z.string(),
  confirmedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
});
export type Affiliation = z.infer<typeof affiliationSchema>;

export const affiliationsPageSchema = z.object({ items: z.array(affiliationSchema), nextCursor: z.string().nullable() });
export type AffiliationsPage = z.infer<typeof affiliationsPageSchema>;

const ciLast3 = z.string().regex(/^[0-9]{3}$/u, 'Escribe los últimos 3 dígitos de tu CI.');

/** `POST /me/affiliations`, strict: a SOCIO names one of the gym's sedes. */
export const personAffiliationInputSchema = z
  .object({
    gymHandle: z.string().trim().min(1).max(31).optional(),
    gymEntityId: z.string().uuid().optional(),
    kind: affiliationKindSchema,
    locationId: z.string().uuid().optional(),
    ciLast3,
    switchGym: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Boolean(value.gymHandle) !== Boolean(value.gymEntityId), { message: 'Indica el gimnasio.', path: ['gymHandle'] })
  .refine((value) => value.kind !== 'SOCIO' || Boolean(value.locationId), { message: 'Elige la sede donde entrenas.', path: ['locationId'] });
export type PersonAffiliationInput = z.infer<typeof personAffiliationInputSchema>;

/** `POST /business/me/gym-links`: a coach business asks a gym by @handle. */
export const coachGymLinkInputSchema = z
  .object({ gymHandle: z.string().trim().min(1).max(31).optional(), gymEntityId: z.string().uuid().optional(), locationId: z.string().uuid().optional() })
  .strict()
  .refine((value) => Boolean(value.gymHandle) !== Boolean(value.gymEntityId), { message: 'Escribe el @usuario del gimnasio.', path: ['gymHandle'] });
export type CoachGymLinkInput = z.infer<typeof coachGymLinkInputSchema>;

const note = z.string().trim().min(3).max(500).optional();
export const rejectAffiliationInputSchema = z.object({ reasonCode: z.enum(affiliationRejectReasons), note }).strict();
export type RejectAffiliationInput = z.infer<typeof rejectAffiliationInputSchema>;
export const endAffiliationInputSchema = z.object({ reasonCode: z.enum(affiliationEndReasons), note }).strict();
export type EndAffiliationInput = z.infer<typeof endAffiliationInputSchema>;

/** Who asked, as the gym sees it: never an id, email, age or the full CI. Null once the row is closed. */
export const gymAffiliationSubjectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PERSON'), displayName: z.string(), photoUrl: z.string().nullable(), ciLast3: z.string().nullable() }),
  z.object({ type: z.literal('BUSINESS'), name: z.string(), handle: z.string().nullable(), logoUrl: z.string().nullable(), badge: z.enum(['VERIFIED', 'NEW']) }),
]);
export type GymAffiliationSubject = z.infer<typeof gymAffiliationSubjectSchema>;

export const gymAffiliationSchema = z.object({
  id: z.string().uuid(),
  kind: affiliationKindSchema,
  status: affiliationStatusSchema,
  subject: gymAffiliationSubjectSchema.nullable(),
  location: locationRefSchema.nullable(),
  requestedAt: z.string(),
  confirmedAt: z.string().nullable(),
});
export type GymAffiliation = z.infer<typeof gymAffiliationSchema>;

export const gymAffiliationsPageSchema = z.object({ items: z.array(gymAffiliationSchema), nextCursor: z.string().nullable() });
export type GymAffiliationsPage = z.infer<typeof gymAffiliationsPageSchema>;
/** The inbox carries the badge's count. */
export const gymAffiliationRequestsPageSchema = gymAffiliationsPageSchema.extend({ pendingCount: z.number().int().min(0) });
export type GymAffiliationRequestsPage = z.infer<typeof gymAffiliationRequestsPageSchema>;

/** `GET /me/gym`: «Mi gimnasio». REQUESTED keeps `gym` null and the request in `pendingRequest`. */
export const myGymSchema = z.object({
  status: z.enum(['NONE', 'REQUESTED', 'CONFIRMED']),
  gym: gymRefSchema.nullable(),
  location: locationRefSchema.nullable(),
  since: z.string().nullable(),
  affiliationId: z.string().uuid().nullable(),
  pendingRequest: z
    .object({ affiliationId: z.string().uuid(), gym: gymRefSchema, location: locationRefSchema.nullable(), requestedAt: z.string(), switchesGym: z.boolean() })
    .nullable(),
  membershipVisible: z.boolean(),
});
export type MyGym = z.infer<typeof myGymSchema>;

export const membershipVisibilityInputSchema = z.object({ membershipVisible: z.boolean() }).strict();

/** «Socio de X» on every directory card: computed by the backend, never set by a client. */
export const gymBadgeSchema = gymRefSchema;
export type GymBadge = z.infer<typeof gymBadgeSchema>;
