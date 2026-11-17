import { z } from 'zod';
import {
  affiliationSchema,
  affiliationsPageSchema,
  coachGymLinkInputSchema,
  endAffiliationInputSchema,
  gymAffiliationRequestsPageSchema,
  gymAffiliationSchema,
  gymAffiliationsPageSchema,
  gymDirectoryEntrySchema,
  membershipVisibilityInputSchema,
  myGymSchema,
  personAffiliationInputSchema,
  rejectAffiliationInputSchema,
  type AffiliationKind,
  type CoachGymLinkInput,
  type EndAffiliationInput,
  type PersonAffiliationInput,
  type RejectAffiliationInput,
} from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

const id = (value: string) => encodeURIComponent(value);
type Page = { cursor?: string | null; limit?: number };

function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
}

/**
 * A person's affiliations (ADR-0025): SOCIO of one gym, ENTRENADOR of several.
 * Persons only: a business account gets 403. «Mi gimnasio» (ADR-0027) reads
 * the confirmed SOCIO; the gym is never a client parameter.
 */
export function createPersonAffiliationsServices(request: RequestFn) {
  const own = (affiliationId: string) => `/me/affiliations/${id(affiliationId)}`;
  return {
    /** `201`; a confirmed SOCIO elsewhere is `409 SOCIO_OF_ANOTHER_GYM` until resent with `switchGym: true`. */
    request: (input: PersonAffiliationInput) =>
      request('/me/affiliations', affiliationSchema, { method: 'POST', body: personAffiliationInputSchema.parse(input) }),
    list: (page: Page = {}) => request(`/me/affiliations${query({ cursor: page.cursor, limit: page.limit ?? 20 })}`, affiliationsPageSchema, { method: 'GET' }),
    get: (affiliationId: string) => request(own(affiliationId), affiliationSchema, { method: 'GET' }),
    cancel: (affiliationId: string) => request(`${own(affiliationId)}/cancel`, affiliationSchema, { method: 'POST' }),
    end: (affiliationId: string) => request(`${own(affiliationId)}/end`, affiliationSchema, { method: 'POST' }),

    myGym: () => request('/me/gym', myGymSchema, { method: 'GET' }),
    setMembershipVisible: (membershipVisible: boolean) =>
      request('/me/gym/visibility', myGymSchema, { method: 'PUT', body: membershipVisibilityInputSchema.parse({ membershipVisible }) }),
    /** `403 GYM_MEMBERSHIP_REQUIRED` without a confirmed SOCIO: a state, not an error. */
    members: (filter: { q?: string; limit?: number } = {}) =>
      request(`/me/gym/members${query({ q: filter.q?.trim(), limit: filter.limit ?? 20 })}`, z.array(gymDirectoryEntrySchema), { method: 'GET' }),
  };
}
export type PersonAffiliationsServices = ReturnType<typeof createPersonAffiliationsServices>;

/** «Mis gimnasios» of a coach business: the same cycle, by @handle (NEGOCIO with a COACH entity). */
export function createCoachGymLinksServices(request: RequestFn) {
  const link = (linkId: string) => `/business/me/gym-links/${id(linkId)}`;
  return {
    request: (input: CoachGymLinkInput) =>
      request('/business/me/gym-links', affiliationSchema, { method: 'POST', body: coachGymLinkInputSchema.parse(input) }),
    list: (page: Page = {}) => request(`/business/me/gym-links${query({ cursor: page.cursor, limit: page.limit ?? 20 })}`, affiliationsPageSchema, { method: 'GET' }),
    get: (linkId: string) => request(link(linkId), affiliationSchema, { method: 'GET' }),
    cancel: (linkId: string) => request(`${link(linkId)}/cancel`, affiliationSchema, { method: 'POST' }),
    end: (linkId: string) => request(`${link(linkId)}/end`, affiliationSchema, { method: 'POST' }),
  };
}
export type CoachGymLinksServices = ReturnType<typeof createCoachGymLinksServices>;

/**
 * The gym's «Socios» (NEGOCIO with a GYM entity): requests while the gym is
 * public (else `409 GYM_NOT_ACTIVE`), members, coaches and the decisions.
 */
export function createGymAffiliationsServices(request: RequestFn) {
  const row = (affiliationId: string) => `/business/me/affiliations/${id(affiliationId)}`;
  return {
    requests: (filter: Page & { kind?: AffiliationKind | null; locationId?: string | null } = {}) =>
      request(
        `/business/me/affiliations/requests${query({ kind: filter.kind, locationId: filter.locationId, cursor: filter.cursor, limit: filter.limit ?? 20 })}`,
        gymAffiliationRequestsPageSchema,
        { method: 'GET' },
      ),
    members: (filter: Page & { locationId?: string | null } = {}) =>
      request(`/business/me/affiliations/members${query({ locationId: filter.locationId, cursor: filter.cursor, limit: filter.limit ?? 20 })}`, gymAffiliationsPageSchema, {
        method: 'GET',
      }),
    coaches: (page: Page = {}) =>
      request(`/business/me/affiliations/coaches${query({ cursor: page.cursor, limit: page.limit ?? 20 })}`, gymAffiliationsPageSchema, { method: 'GET' }),
    get: (affiliationId: string) => request(row(affiliationId), gymAffiliationSchema, { method: 'GET' }),
    confirm: (affiliationId: string) => request(`${row(affiliationId)}/confirm`, gymAffiliationSchema, { method: 'POST' }),
    reject: (affiliationId: string, input: RejectAffiliationInput) =>
      request(`${row(affiliationId)}/reject`, gymAffiliationSchema, { method: 'POST', body: rejectAffiliationInputSchema.parse(input) }),
    end: (affiliationId: string, input: EndAffiliationInput) =>
      request(`${row(affiliationId)}/end`, gymAffiliationSchema, { method: 'POST', body: endAffiliationInputSchema.parse(input) }),
  };
}
export type GymAffiliationsServices = ReturnType<typeof createGymAffiliationsServices>;
