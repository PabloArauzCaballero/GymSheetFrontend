import { describe, expect, it } from 'vitest';
import { gymAffiliationSchema, myGymSchema, personAffiliationInputSchema } from '@gymsheet/schemas';
import { createCoachGymLinksServices, createGymAffiliationsServices, createPersonAffiliationsServices } from './affiliation-services';
import { createApiClient } from './client';

const GYM = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const SEDE = '0190e2cb-a6d4-7ec3-8f91-a6c735631502';
const AFF = '0190e2cb-a6d4-7ec3-8f91-a6c735631503';
const own = {
  id: AFF,
  kind: 'SOCIO',
  status: 'REQUESTED',
  gym: { id: GYM, name: 'Top', handle: 'top', logoUrl: null },
  location: { id: SEDE, name: 'Centro' },
  ciLast3: '123',
  replacesAffiliationId: null,
  reasonCode: null,
  reasonNote: null,
  requestedAt: '2026-11-17T10:00:00.000Z',
  confirmedAt: null,
  closedAt: null,
};
const gymRow = {
  id: AFF,
  kind: 'SOCIO',
  status: 'REQUESTED',
  subject: { type: 'PERSON', displayName: 'Ana P.', photoUrl: null, ciLast3: '123' },
  location: { id: SEDE, name: 'Centro' },
  requestedAt: '2026-11-17T10:00:00.000Z',
  confirmedAt: null,
};
const myGym = { status: 'NONE', gym: null, location: null, since: null, affiliationId: null, pendingRequest: null, membershipVisible: true };

type Call = { url: string; method: string; body: unknown };

function recordingClient(answer: (url: string) => unknown) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url: url.replace('https://api.test', ''), method: init.method ?? 'GET', body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify({ ok: true, data: answer(url) }), { status: 200 });
  }) as typeof fetch;
  return { calls, client: createApiClient({ baseUrl: 'https://api.test', fetchImpl }) };
}

describe('affiliation schemas', () => {
  it('keeps the person request strict and asks a SOCIO for a sede', () => {
    expect(personAffiliationInputSchema.safeParse({ gymHandle: 'top', kind: 'SOCIO', ciLast3: '123' }).success).toBe(false);
    expect(personAffiliationInputSchema.safeParse({ gymHandle: 'top', kind: 'SOCIO', locationId: SEDE, ciLast3: '123', status: 'CONFIRMED' }).success).toBe(false);
    expect(personAffiliationInputSchema.safeParse({ gymHandle: 'top', gymEntityId: GYM, kind: 'ENTRENADOR', ciLast3: '123' }).success).toBe(false);
    expect(personAffiliationInputSchema.safeParse({ gymHandle: 'top', kind: 'ENTRENADOR', ciLast3: '12a' }).success).toBe(false);
  });
  it('reads a closed gym row without a subject', () => {
    expect(gymAffiliationSchema.parse({ ...gymRow, status: 'ENDED', subject: null }).subject).toBeNull();
  });
});

describe('createPersonAffiliationsServices', () => {
  it('requests, lists, cancels and ends on the person routes', async () => {
    const { calls, client } = recordingClient(() => own);
    const affiliations = createPersonAffiliationsServices(client.request);
    await affiliations.request({ gymHandle: 'top', kind: 'SOCIO', locationId: SEDE, ciLast3: '123', switchGym: true });
    await affiliations.cancel(AFF);
    await affiliations.end(AFF);
    expect(calls).toEqual([
      { url: '/me/affiliations', method: 'POST', body: { gymHandle: 'top', kind: 'SOCIO', locationId: SEDE, ciLast3: '123', switchGym: true } },
      { url: `/me/affiliations/${AFF}/cancel`, method: 'POST', body: undefined },
      { url: `/me/affiliations/${AFF}/end`, method: 'POST', body: undefined },
    ]);
  });
  it('reads «Mi gimnasio», its switch and its members without a gym id', async () => {
    const { calls, client } = recordingClient((url) => (url.includes('members') ? [] : myGym));
    const affiliations = createPersonAffiliationsServices(client.request);
    expect(myGymSchema.parse(await affiliations.myGym()).status).toBe('NONE');
    await affiliations.setMembershipVisible(false);
    await affiliations.members({ q: ' ana ' });
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual(['GET /me/gym', 'PUT /me/gym/visibility', 'GET /me/gym/members?q=ana&limit=20']);
    expect(calls[1]?.body).toEqual({ membershipVisible: false });
  });
});

describe('business affiliation services', () => {
  it('filters the gym inbox and sends the reason chips', async () => {
    const { calls, client } = recordingClient((url) => (url.includes('requests') ? { items: [gymRow], nextCursor: null, pendingCount: 1 } : { ...gymRow, subject: null }));
    const gym = createGymAffiliationsServices(client.request);
    expect((await gym.requests({ kind: 'SOCIO', locationId: SEDE })).pendingCount).toBe(1);
    await gym.reject(AFF, { reasonCode: 'CI_MISMATCH' });
    await gym.end(AFF, { reasonCode: 'OTHER', note: 'Se mudó' });
    expect(calls.map((call) => call.url)).toEqual([
      `/business/me/affiliations/requests?kind=SOCIO&locationId=${SEDE}&limit=20`,
      `/business/me/affiliations/${AFF}/reject`,
      `/business/me/affiliations/${AFF}/end`,
    ]);
    expect(() => gym.reject(AFF, { reasonCode: 'NO_LONGER_MEMBER' } as never)).toThrow();
  });
  it('asks a gym by @handle from the coach business', async () => {
    const { calls, client } = recordingClient(() => ({ ...own, kind: 'ENTRENADOR', ciLast3: null }));
    const links = createCoachGymLinksServices(client.request);
    await links.request({ gymHandle: 'top' });
    expect(calls[0]).toEqual({ url: '/business/me/gym-links', method: 'POST', body: { gymHandle: 'top' } });
    expect(() => links.request({ gymHandle: 'top', kind: 'SOCIO' } as never)).toThrow();
  });
});
