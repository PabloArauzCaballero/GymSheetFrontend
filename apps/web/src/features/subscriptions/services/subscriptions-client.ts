import { ApiError, createBusinessSubscriptionsServices, createPersonSubscriptionsServices } from '@gymsheet/api-client';
import { subscriptionErrorMessage } from '@gymsheet/domain';
import { apiRequest } from '@/shared/api/api-client';

/** «Mis suscripciones» through the generic BFF (same shared services as the mobile). */
export const personSubscriptionsService = createPersonSubscriptionsServices(apiRequest);

/** «Suscriptores» of the business; the backend answers 403 to anyone but NEGOCIO. */
export const businessSubscriptionsService = createBusinessSubscriptionsServices(apiRequest);

/** The Spanish text of a checkout or subscription error: our copy for a known code, else the server's message. */
export function subscriptionErrorText(error: unknown): string {
  if (error instanceof ApiError) return subscriptionErrorMessage(error.code, error.message, error.details);
  return error instanceof Error ? error.message : 'Algo salió mal. Vuelve a intentarlo.';
}
