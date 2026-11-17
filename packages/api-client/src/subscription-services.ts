import {
  cancelSubscriptionInputSchema,
  mySubscriptionsSchema,
  subscriberSchema,
  subscribersPageSchema,
  subscriptionDetailSchema,
  suspendSubscriptionInputSchema,
  type CancelSubscriptionInput,
  type SubscriberFilter,
  type SuspendSubscriptionInput,
} from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

const id = (value: string) => encodeURIComponent(value);

/**
 * «Mis suscripciones» (ADR-0026): the person's periods grouped by seller.
 * Persons only: a business account gets 403; someone else's period is 404.
 */
export function createPersonSubscriptionsServices(request: RequestFn) {
  return {
    list: () => request('/me/subscriptions', mySubscriptionsSchema, { method: 'GET' }),
    /** `periodId` is a period's id (`current.id` or `upcoming.id` of a line). */
    get: (periodId: string) => request(`/me/subscriptions/${id(periodId)}`, subscriptionDetailSchema, { method: 'GET' }),
  };
}
export type PersonSubscriptionsServices = ReturnType<typeof createPersonSubscriptionsServices>;

/**
 * «Suscriptores» of the business (ADR-0026): the latest period of each person
 * and listing it sold, soonest end first. NEGOCIO only; another business's
 * period is 404. Cancel is final; suspend and reactivate go back and forth.
 */
export function createBusinessSubscriptionsServices(request: RequestFn) {
  const period = (periodId: string) => `/business/me/subscriptions/${id(periodId)}`;
  return {
    list: (filter: { status?: SubscriberFilter | null; cursor?: string | null; limit?: number } = {}) => {
      const params = new URLSearchParams({ limit: String(filter.limit ?? 20) });
      if (filter.status) params.set('status', filter.status);
      if (filter.cursor) params.set('cursor', filter.cursor);
      return request(`/business/me/subscriptions?${params.toString()}`, subscribersPageSchema, { method: 'GET' });
    },
    get: (periodId: string) => request(period(periodId), subscriberSchema, { method: 'GET' }),
    /** `422 SUBSCRIPTION_NOTE_REQUIRED` with OTHER and no note; `409 SUBSCRIPTION_INVALID_TRANSITION` once ended. */
    cancel: (periodId: string, input: CancelSubscriptionInput) =>
      request(`${period(periodId)}/cancel`, subscriberSchema, { method: 'POST', body: cancelSubscriptionInputSchema.parse(input) }),
    suspend: (periodId: string, input: SuspendSubscriptionInput) =>
      request(`${period(periodId)}/suspend`, subscriberSchema, { method: 'POST', body: suspendSubscriptionInputSchema.parse(input) }),
    reactivate: (periodId: string) => request(`${period(periodId)}/reactivate`, subscriberSchema, { method: 'POST' }),
  };
}
export type BusinessSubscriptionsServices = ReturnType<typeof createBusinessSubscriptionsServices>;
