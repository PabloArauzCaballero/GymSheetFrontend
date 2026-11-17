import { describe, expect, it } from 'vitest';
import { mySubscriptionsSchema, subscriberSchema } from '@gymsheet/schemas';
import { createApiClient } from './client';
import { createBusinessSubscriptionsServices, createPersonSubscriptionsServices } from './subscription-services';

const PERIOD = '0190e2cb-a6d4-7ec3-8f91-a6c735631511';
const ORDER = '0190e2cb-a6d4-7ec3-8f91-a6c735631512';
const period = { id: PERIOD, status: 'ACTIVE', startsOn: '2026-11-17', endsOn: '2026-12-16', daysLeft: 29, sessions: null, origin: 'MARKETPLACE' };
const subscriber = {
  ...period,
  subscriber: { displayName: 'Ana P.' },
  listing: { id: 'l1', name: 'Mensual', offerKind: 'MEMBERSHIP' },
  affiliation: { id: 'a1', status: 'CONFIRMED', location: 'Centro' },
  lastPayment: { orderNumber: 'R-1', amount: '150.00', currency: 'BOB', method: 'QR', paidAt: null },
  actions: { canCancel: true, canSuspend: true, canReactivate: false },
};

function recordingClient(answer: (url: string) => unknown) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url: url.replace('https://api.test', ''), method: init.method ?? 'GET', body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify({ ok: true, data: answer(url) }), { status: 200 });
  }) as typeof fetch;
  return { calls, client: createApiClient({ baseUrl: 'https://api.test', fetchImpl }) };
}

describe('subscription schemas', () => {
  it('reads a group with a pending line and a legacy group without seller', () => {
    const parsed = mySubscriptionsSchema.parse({
      today: '2026-11-17',
      items: [
        {
          seller: { entityId: 'g1', name: 'Top', handle: 'top', logoUrl: null, entityType: 'GYM' },
          affiliation: { id: 'a1', status: 'REQUESTED' },
          subscriptions: [{ listing: { id: 'l1', name: 'Mensual', offerKind: 'MEMBERSHIP' }, status: 'PENDING', current: null, upcoming: null, pendingOrder: { id: ORDER, orderNumber: 'R-1', status: 'PENDING_VERIFICATION' }, renew: { listingId: 'l1', available: false } }],
        },
        { seller: null, affiliation: null, subscriptions: [{ listing: { id: null, name: 'Plan', offerKind: 'MEMBERSHIP' }, status: 'EXPIRED', current: { ...period, status: 'EXPIRED', origin: 'LEGACY', daysLeft: 0 }, upcoming: null, pendingOrder: null, renew: null }] },
      ],
    });
    expect(parsed.items[1]?.seller).toBeNull();
  });
  it('never carries an email or a CI of a subscriber', () => {
    expect(Object.keys(subscriberSchema.parse({ ...subscriber, email: 'x@y.z' }))).not.toContain('email');
  });
});

describe('createPersonSubscriptionsServices', () => {
  it('reads the list and one period', async () => {
    const { calls, client } = recordingClient((url) => (url.endsWith('/me/subscriptions') ? { today: '2026-11-17', items: [] } : { ...period, listing: subscriber.listing, seller: null, renew: null, history: [] }));
    const subscriptions = createPersonSubscriptionsServices(client.request);
    await subscriptions.list();
    await subscriptions.get(PERIOD);
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual(['GET /me/subscriptions', `GET /me/subscriptions/${PERIOD}`]);
  });
});

describe('createBusinessSubscriptionsServices', () => {
  it('filters, decides with a strict reason and reactivates', async () => {
    const { calls, client } = recordingClient((url) => (url.includes('?') ? { today: '2026-11-17', items: [subscriber], nextCursor: null } : subscriber));
    const subscribers = createBusinessSubscriptionsServices(client.request);
    await subscribers.list({ status: 'EXPIRING', cursor: 'abc' });
    await subscribers.cancel(PERIOD, { reasonCode: 'REFUNDED_BY_BUSINESS' });
    await subscribers.suspend(PERIOD, { reasonCode: 'OTHER', note: 'Pidió pausa' });
    await subscribers.reactivate(PERIOD);
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET /business/me/subscriptions?limit=20&status=EXPIRING&cursor=abc',
      `POST /business/me/subscriptions/${PERIOD}/cancel`,
      `POST /business/me/subscriptions/${PERIOD}/suspend`,
      `POST /business/me/subscriptions/${PERIOD}/reactivate`,
    ]);
    expect(calls[2]?.body).toEqual({ reasonCode: 'OTHER', note: 'Pidió pausa' });
    expect(() => subscribers.suspend(PERIOD, { reasonCode: 'REFUNDED_BY_BUSINESS' } as never)).toThrow();
  });
});
