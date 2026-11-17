// Periods are addressed by UUID only.
const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

/**
 * BFF routes of the unified subscriptions (ADR-0026, franja 8e): the person's
 * «Mis suscripciones» and the business's «Suscriptores». The backend
 * authorizes each side (persons on `me/*`, NEGOCIO on `business/me/*`).
 */
export const subscriptionRoutePatterns: readonly RegExp[] = [
  /^\/me\/subscriptions$/u,
  new RegExp(`^/me/subscriptions/${uuid}$`, 'u'),
  /^\/business\/me\/subscriptions$/u,
  new RegExp(`^/business/me/subscriptions/${uuid}(/(cancel|suspend|reactivate))?$`, 'u'),
];

/** Who holds a plan with whom and what they paid: never stored by any cache. */
export function isSubscriptionNoStorePath(path: string): boolean {
  return path.startsWith('/me/subscriptions') || path.startsWith('/business/me/subscriptions');
}
