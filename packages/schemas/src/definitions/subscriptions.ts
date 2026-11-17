import { z } from 'zod';

/**
 * Unified subscriptions (backend ADR-0026, franja 8e): one ledger of periods
 * opened by orders the business confirmed. A gym membership is a confirmed
 * SOCIO affiliation plus an ACTIVE period of that gym's MEMBERSHIP listing.
 * Dates are `YYYY-MM-DD` in the business time zone; `today` comes with them.
 */
export const periodStatuses = ['UPCOMING', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] as const;
export const periodStatusSchema = z.enum(periodStatuses);
export type PeriodStatus = z.infer<typeof periodStatusSchema>;

/** A line with only an open order is PENDING. */
export const subscriptionLineStatusSchema = z.enum([...periodStatuses, 'PENDING']);
export type SubscriptionLineStatus = z.infer<typeof subscriptionLineStatusSchema>;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

export const subscriptionPeriodSchema = z.object({
  id: z.string().uuid(),
  status: periodStatusSchema,
  startsOn: dateOnly,
  endsOn: dateOnly.nullable(),
  daysLeft: z.number().int().min(0).nullable(),
  sessions: z.object({ total: z.number().int(), used: z.number().int() }).nullable(),
  origin: z.enum(['MARKETPLACE', 'LEGACY']),
});
export type SubscriptionPeriod = z.infer<typeof subscriptionPeriodSchema>;

const listingRefSchema = z.object({ id: z.string().nullable(), name: z.string(), offerKind: z.string() });
const renewSchema = z.object({ listingId: z.string(), available: z.boolean() }).nullable();

export const subscriptionLineSchema = z.object({
  listing: listingRefSchema,
  status: subscriptionLineStatusSchema,
  current: subscriptionPeriodSchema.nullable(),
  upcoming: subscriptionPeriodSchema.nullable(),
  pendingOrder: z.object({ id: z.string().uuid(), orderNumber: z.string(), status: z.string() }).nullable(),
  renew: renewSchema,
});
export type SubscriptionLine = z.infer<typeof subscriptionLineSchema>;

export const subscriptionSellerSchema = z.object({
  entityId: z.string(),
  name: z.string(),
  handle: z.string().nullable(),
  logoUrl: z.string().nullable(),
  entityType: z.string(),
});
export type SubscriptionSeller = z.infer<typeof subscriptionSellerSchema>;

export const subscriptionGroupSchema = z.object({
  /** Null for a legacy period of an unknown gym. */
  seller: subscriptionSellerSchema.nullable(),
  /** The person's live SOCIO at that gym. */
  affiliation: z.object({ id: z.string(), status: z.string() }).nullable(),
  subscriptions: z.array(subscriptionLineSchema),
});
export type SubscriptionGroup = z.infer<typeof subscriptionGroupSchema>;

/** `GET /me/subscriptions`. */
export const mySubscriptionsSchema = z.object({ today: dateOnly, items: z.array(subscriptionGroupSchema) });
export type MySubscriptions = z.infer<typeof mySubscriptionsSchema>;

/** `GET /me/subscriptions/:id`: the period, what it is and its history (never who changed it). */
export const subscriptionDetailSchema = subscriptionPeriodSchema.extend({
  listing: listingRefSchema,
  seller: z.object({ entityId: z.string(), name: z.string(), handle: z.string().nullable() }).nullable(),
  renew: renewSchema,
  history: z.array(z.object({ fromStatus: z.string().nullable(), toStatus: z.string(), reasonCode: z.string().nullable(), at: z.string() })),
});
export type SubscriptionDetail = z.infer<typeof subscriptionDetailSchema>;

/** A subscriber of the business: no email, user id or CI. */
export const subscriberSchema = subscriptionPeriodSchema.extend({
  subscriber: z.object({ displayName: z.string() }),
  listing: listingRefSchema,
  affiliation: z.object({ id: z.string(), status: z.string(), location: z.string().nullable() }).nullable(),
  lastPayment: z
    .object({ orderNumber: z.string(), amount: z.string(), currency: z.string(), method: z.string(), paidAt: z.string().nullable() })
    .nullable(),
  actions: z.object({ canCancel: z.boolean(), canSuspend: z.boolean(), canReactivate: z.boolean() }),
});
export type Subscriber = z.infer<typeof subscriberSchema>;

export const subscribersPageSchema = z.object({ today: dateOnly, items: z.array(subscriberSchema), nextCursor: z.string().nullable() });
export type SubscribersPage = z.infer<typeof subscribersPageSchema>;

/** `?status=` of «Suscriptores»: EXPIRING is «por vencer», EXPIRED «vencidos». */
export const subscriberFilters = ['ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] as const;
export type SubscriberFilter = (typeof subscriberFilters)[number];

export const subscriptionCancelReasons = ['BUYER_REQUEST', 'REFUNDED_BY_BUSINESS', 'PAYMENT_ISSUE', 'CONDUCT', 'OTHER'] as const;
export const subscriptionSuspendReasons = ['BUYER_REQUEST', 'PAYMENT_ISSUE', 'HEALTH', 'CONDUCT', 'OTHER'] as const;
export type SubscriptionCancelReason = (typeof subscriptionCancelReasons)[number];
export type SubscriptionSuspendReason = (typeof subscriptionSuspendReasons)[number];
export type SubscriptionReason = SubscriptionCancelReason | SubscriptionSuspendReason;

const note = z.string().trim().min(3).max(500).optional();
export const cancelSubscriptionInputSchema = z.object({ reasonCode: z.enum(subscriptionCancelReasons), note }).strict();
export const suspendSubscriptionInputSchema = z.object({ reasonCode: z.enum(subscriptionSuspendReasons), note }).strict();
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionInputSchema>;
export type SuspendSubscriptionInput = z.infer<typeof suspendSubscriptionInputSchema>;
