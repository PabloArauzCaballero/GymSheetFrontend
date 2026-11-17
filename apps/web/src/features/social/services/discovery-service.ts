import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  DiscoveryCard,
  SwipeDirection,
  SwipeResult,
  UndoSwipeResult,
} from '@/shared/api/schemas';
import {
  discoveryDeckSchema,
  swipeResultSchema,
  undoSwipeResultSchema,
} from '@/shared/api/schemas';
import type { DirectoryFilters } from './social-service';
import { directoryQueryString } from './social-service';

/**
 * Deck filters. Gender is deliberately absent: the saved discovery
 * preferences (`genders`) are the single source of who appears in the deck.
 */
export type DeckFilters = Pick<DirectoryFilters, 'objetivo' | 'sucursalId' | 'limit'>;

/**
 * Descubrimiento: la baraja y los swipes.
 *
 * Va aparte de `socialService` por la misma razón que en el móvil: es otro
 * modelo de interacción sobre el mismo catálogo —el directorio se recorre, la
 * baraja se consume— y el backend lo sirve bajo `/me/discovery`. Aquí está la
 * diferencia importante con lo que había antes en la web: un «paso» es una
 * decisión que se guarda en el servidor, no un `slice()` de un array local que
 * se evaporaba al recargar.
 */
export const discoveryService = {
  /** Candidatos sin decidir, con sus razones y distancia. El backend acota `limit`; por defecto trae 10. */
  deck: (filters: DeckFilters = {}) =>
    apiRequest<DiscoveryCard[]>(
      `/me/discovery/deck?${directoryQueryString(filters)}`,
      discoveryDeckSchema,
    ),
  observeImpression: (impressionId: string) =>
    apiRequest<{ observed: true }>(
      '/me/discovery/impressions',
      z.object({ observed: z.literal(true) }),
      {
        method: 'POST',
        body: { impressionId },
      },
    ),
  /** «Me gusta» mutuo = match automático: la respuesta llega con `matched: true`. */
  swipe: (targetId: string, direction: SwipeDirection, impressionId?: string) =>
    apiRequest<SwipeResult>('/me/discovery/swipes', swipeResultSchema, {
      method: 'POST',
      body: { targetId, direction, impressionId },
    }),
  /** Deshace el último swipe. El backend responde 409 si el match ya tiene mensajes. */
  undoSwipe: () =>
    apiRequest<UndoSwipeResult>('/me/discovery/swipes/undo', undoSwipeResultSchema, {
      method: 'POST',
    }),
};
