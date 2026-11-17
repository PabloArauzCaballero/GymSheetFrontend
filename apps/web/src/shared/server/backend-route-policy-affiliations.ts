// Affiliations are addressed by UUID only.
const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

/**
 * BFF routes of the affiliations (ADR-0025, franja 7b) and «Mi gimnasio»
 * (ADR-0027, franja 7c). The backend authorizes each side: persons on `me/*`,
 * a GYM business on `business/me/affiliations`, a COACH on `gym-links`.
 */
export const affiliationRoutePatterns: readonly RegExp[] = [
  /^\/me\/affiliations$/u,
  new RegExp(`^/me/affiliations/${uuid}(/(cancel|end))?$`, 'u'),
  /^\/me\/gym(\/(visibility|members))?$/u,
  /^\/business\/me\/gym-links$/u,
  new RegExp(`^/business/me/gym-links/${uuid}(/(cancel|end))?$`, 'u'),
  /^\/business\/me\/affiliations\/(requests|members|coaches)$/u,
  new RegExp(`^/business/me/affiliations/${uuid}(/(confirm|reject|end))?$`, 'u'),
];

/** The CI digits of a live request and where a person trains: never stored by any cache. */
export function isAffiliationNoStorePath(path: string): boolean {
  return path.startsWith('/me/affiliations') || /^\/me\/gym(\/|$)/u.test(path) || path.startsWith('/business/me/affiliations') || path.startsWith('/business/me/gym-links');
}
