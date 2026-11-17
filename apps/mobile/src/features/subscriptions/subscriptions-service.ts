import { ApiError, createBusinessSubscriptionsServices, createPersonSubscriptionsServices } from '@gymsheet/api-client';
import { subscriptionErrorMessage } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** «Mis suscripciones» and the business's «Suscriptores»: the same shared services as the web (ADR-0026). */
export const personSubscriptionsService = createPersonSubscriptionsServices(apiClient.request);
export const businessSubscriptionsService = createBusinessSubscriptionsServices(apiClient.request);

/** `GET /me/subscriptions`, shared by the list, Perfil, Inicio and «Mi gimnasio». */
export function useMySubscriptions(enabled = true) {
  return useQuery({ queryKey: queryKeys.subscriptions.list, queryFn: personSubscriptionsService.list, staleTime: 30_000, enabled });
}

/** The Spanish text of a checkout or subscription error: our copy for its code, else the server's message. */
export function subscriptionErrorText(error: unknown): string {
  if (error instanceof ApiError) return subscriptionErrorMessage(error.code, error.message, error.details);
  return error instanceof Error ? error.message : 'Algo salió mal. Vuelve a intentarlo.';
}
