import { describe, expect, it } from 'vitest';
import type { MyGym, MySubscriptions, Subscriber, SubscriptionLine, SubscriptionPeriod } from '@gymsheet/schemas';
import {
  checkoutAffiliationOf,
  daysLeftText,
  formatDayMonth,
  headlineSubscription,
  linePeriodId,
  myGymPlanText,
  needsSocioStep,
  periodRangeText,
  renewListingId,
  sessionsText,
  socioPlanChip,
  subscriberFacts,
} from './subscriptions';
import { historyEntryText, subscriptionErrorMessage } from './subscriptions-copy';

const GYM = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const OTHER_GYM = '0190e2cb-a6d4-7ec3-8f91-a6c735631509';
const period = (patch: Partial<SubscriptionPeriod> = {}): SubscriptionPeriod => ({
  id: '0190e2cb-a6d4-7ec3-8f91-a6c735631511',
  status: 'ACTIVE',
  startsOn: '2026-11-17',
  endsOn: '2026-12-16',
  daysLeft: 29,
  sessions: null,
  origin: 'MARKETPLACE',
  ...patch,
});
const line = (patch: Partial<SubscriptionLine> = {}): SubscriptionLine => ({
  listing: { id: 'l1', name: 'Mensual', offerKind: 'MEMBERSHIP' },
  status: 'ACTIVE',
  current: period(),
  upcoming: null,
  pendingOrder: null,
  renew: { listingId: 'l1', available: true },
  ...patch,
});
const seller = (entityId: string, entityType = 'GYM') => ({ entityId, name: entityId === GYM ? 'Top' : 'Otro', handle: null, logoUrl: null, entityType });
const data = (lines: SubscriptionLine[], entityId = GYM, entityType = 'GYM'): MySubscriptions => ({
  today: '2026-11-17',
  items: [{ seller: seller(entityId, entityType), affiliation: null, subscriptions: lines }],
});
const myGym = (patch: Partial<MyGym> = {}): MyGym => ({
  status: 'CONFIRMED',
  gym: { id: GYM, name: 'Top', handle: 'top', logoUrl: null },
  location: null,
  since: null,
  affiliationId: 'a1',
  pendingRequest: null,
  membershipVisible: true,
  ...patch,
});
const listing = (offerKind: string, entityType = 'GYM', id = GYM) => ({ offerKind, seller: { id, entityType } });

describe('periods in words', () => {
  it('formats calendar days without shifting them', () => {
    expect(formatDayMonth('2026-12-01')).toBe('1 de diciembre');
    expect(formatDayMonth('2027-01-05', '2026-11-17')).toBe('5 de enero de 2027');
    expect(periodRangeText(period())).toBe('Del 17 de noviembre al 16 de diciembre');
    expect(periodRangeText(period({ endsOn: null }))).toBe('Desde el 17 de noviembre');
  });
  it('counts days only while the period runs', () => {
    expect(daysLeftText(period())).toBe('Quedan 29 días');
    expect(daysLeftText(period({ daysLeft: 1, status: 'EXPIRING' }))).toBe('Queda 1 día');
    expect(daysLeftText(period({ daysLeft: 0, status: 'EXPIRING' }))).toBe('Vence hoy');
    expect(daysLeftText(period({ daysLeft: 0, status: 'EXPIRED' }))).toBeNull();
    expect(daysLeftText(period({ daysLeft: null }))).toBeNull();
  });
  it('words sessions, the detail target and «Renovar»', () => {
    expect(sessionsText({ total: 10, used: 3 })).toBe('Usaste 3 de 10 sesiones');
    expect(sessionsText(null)).toBeNull();
    expect(linePeriodId(line({ current: null, upcoming: period({ id: 'u' }) }))).toBe('u');
    expect(renewListingId(line())).toBe('l1');
    expect(renewListingId(line({ renew: { listingId: 'l1', available: false } }))).toBeNull();
  });
});

describe('«Mi gimnasio» plan line', () => {
  it('says until when a confirmed SOCIO is covered, counting a chained renewal', () => {
    expect(myGymPlanText(myGym(), data([line()]))?.label).toBe('Socio activo hasta el 16 de diciembre');
    expect(myGymPlanText(myGym(), data([line({ upcoming: period({ startsOn: '2026-12-17', endsOn: '2027-01-15' }) })]))?.label).toBe(
      'Socio activo hasta el 15 de enero de 2027',
    );
  });
  it('says the plan ended, is missing or the request is on its way', () => {
    expect(myGymPlanText(myGym(), data([line({ status: 'EXPIRED', current: period({ status: 'EXPIRED' }) })]))?.label).toBe('Socio · plan vencido');
    expect(myGymPlanText(myGym(), data([line()], OTHER_GYM))?.label).toBe('Socio · sin plan');
    expect(myGymPlanText(myGym(), undefined)).toBeNull();
    const requested = myGym({ status: 'REQUESTED', gym: null, pendingRequest: { affiliationId: 'a2', gym: { id: GYM, name: 'Top', handle: null, logoUrl: null }, location: null, requestedAt: '2026-11-17T10:00:00Z', switchesGym: false } });
    expect(myGymPlanText(requested, data([]))?.label).toBe('Solicitud enviada');
    expect(myGymPlanText(myGym({ status: 'NONE', gym: null }), data([]))).toBeNull();
  });
  it('ignores a day pass of the same gym', () => {
    expect(myGymPlanText(myGym(), data([line({ listing: { id: 'p', name: 'Pase', offerKind: 'DAY_PASS' } })]))?.label).toBe('Socio · sin plan');
  });
});

describe('headlineSubscription', () => {
  it('shows the running line that ends first', () => {
    const soon = line({ listing: { id: 'p', name: 'Pack', offerKind: 'CLASS_PACK' }, current: period({ endsOn: '2026-11-20', daysLeft: 3, status: 'EXPIRING' }), status: 'EXPIRING' });
    const both: MySubscriptions = { today: '2026-11-17', items: [...data([line()]).items, ...data([soon], OTHER_GYM, 'COACH').items] };
    expect(headlineSubscription(both)?.line.listing.name).toBe('Pack');
    expect(headlineSubscription(data([line({ status: 'EXPIRED' })]))).toBeNull();
  });
});

describe('checkout «Hazte socio»', () => {
  it('asks only for a gym membership whose buyer is not SOCIO there', () => {
    expect(needsSocioStep(listing('MEMBERSHIP'), myGym({ status: 'NONE', gym: null }))).toBe(true);
    expect(needsSocioStep(listing('MEMBERSHIP', 'GYM', OTHER_GYM), myGym())).toBe(true);
    expect(needsSocioStep(listing('MEMBERSHIP'), myGym())).toBe(false);
    expect(needsSocioStep(listing('DAY_PASS'), myGym({ status: 'NONE', gym: null }))).toBe(false);
    expect(needsSocioStep(listing('MEMBERSHIP', 'CENTER'), myGym({ status: 'NONE', gym: null }))).toBe(false);
    expect(needsSocioStep(listing('MEMBERSHIP'), null)).toBe(false);
  });
  it('treats a pending request at that gym (a switch included) as SOCIO', () => {
    const pending = { affiliationId: 'a2', gym: { id: OTHER_GYM, name: 'Otro', handle: null, logoUrl: null }, location: null, requestedAt: '2026-11-17T10:00:00Z', switchesGym: true };
    expect(needsSocioStep(listing('MEMBERSHIP', 'GYM', OTHER_GYM), myGym({ pendingRequest: pending }))).toBe(false);
  });
  it('builds the strict affiliation, with the switch only when asked', () => {
    expect(checkoutAffiliationOf({ locationId: 's', ciLast3: '123' })).toEqual({ locationId: 's', ciLast3: '123' });
    expect(checkoutAffiliationOf({ locationId: 's', ciLast3: '123' }, true)).toEqual({ locationId: 's', ciLast3: '123', switchGym: true });
  });
});

describe('the gym reads its SOCIOs and subscribers', () => {
  const subscriber = (patch: Partial<Subscriber>): Subscriber => ({
    ...period(),
    subscriber: { displayName: 'Ana P.' },
    listing: { id: 'l1', name: 'Mensual', offerKind: 'MEMBERSHIP' },
    affiliation: { id: 'a1', status: 'CONFIRMED', location: 'Centro' },
    lastPayment: null,
    actions: { canCancel: true, canSuspend: true, canReactivate: false },
    ...patch,
  });
  it('puts «Activo hasta», «Plan vencido» or «Sin plan» on a SOCIO', () => {
    expect(socioPlanChip('a1', [subscriber({})], true)?.label).toBe('Activo hasta el 16 de diciembre');
    expect(socioPlanChip('a1', [subscriber({ status: 'EXPIRED' })], true)?.label).toBe('Plan vencido');
    expect(socioPlanChip('a2', [subscriber({})], true)?.label).toBe('Sin plan');
    expect(socioPlanChip('a2', [subscriber({})], false)).toBeNull();
  });
  it('lists plan, sede and end', () => {
    expect(subscriberFacts(subscriber({}))).toBe('Mensual · Centro · Hasta el 16 de diciembre');
    expect(subscriberFacts(subscriber({ status: 'EXPIRED', affiliation: null }))).toBe('Mensual · Venció el 16 de diciembre');
  });
});

describe('subscription copy', () => {
  it('words the history without saying who', () => {
    expect(historyEntryText({ fromStatus: null, toStatus: 'ACTIVE', reasonCode: null })).toBe('Se activó');
    expect(historyEntryText({ fromStatus: 'SUSPENDED', toStatus: 'ACTIVE', reasonCode: null })).toBe('Se reactivó');
    expect(historyEntryText({ fromStatus: 'ACTIVE', toStatus: 'SUSPENDED', reasonCode: 'HEALTH' })).toBe('Se suspendió · Por un tema de salud.');
  });
  it('routes each code to its words', () => {
    expect(subscriptionErrorMessage('SUBSCRIPTION_NOTE_REQUIRED', 'x')).toMatch(/Explica/u);
    expect(subscriptionErrorMessage('AFFILIATION_LOCATION_INVALID', 'x')).toBe('Esa sede no es de este gimnasio. Elige otra.');
    expect(subscriptionErrorMessage('AFFILIATION_COOLDOWN', 'x', { retryAfter: 'nope' })).toMatch(/Todavía no puedes/u);
    expect(subscriptionErrorMessage('ORDER_ALREADY_OPEN', 'x')).toMatch(/pedido abierto/u);
    expect(subscriptionErrorMessage('UNKNOWN', 'del servidor')).toBe('del servidor');
  });
});
