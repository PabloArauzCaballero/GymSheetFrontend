import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  GymDirectoryEntry,
  SwipeDirection,
  SwipeResult,
  UndoSwipeResult,
} from '@/shared/api/schemas';
import {
  gymDirectoryEntrySchema,
  swipeResultSchema,
  undoSwipeResultSchema,
} from '@/shared/api/schemas';
import type { DirectoryFilters } from './social-service';
import { directoryQueryString } from './social-service';

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
  /** Candidatos sin decidir. El backend acota `limit`; por defecto trae 10. */
  deck: (filters: DirectoryFilters = {}) =>
    apiRequest<GymDirectoryEntry[]>(
      `/me/discovery/deck?${directoryQueryString(filters)}`,
      z.array(gymDirectoryEntrySchema),
    ),
  /** «Me gusta» mutuo = match automático: la respuesta llega con `matched: true`. */
  swipe: (targetId: string, direction: SwipeDirection) =>
    apiRequest<SwipeResult>('/me/discovery/swipes', swipeResultSchema, {
      method: 'POST',
      body: { targetId, direction },
    }),
  /** Deshace el último swipe. El backend responde 409 si el match ya tiene mensajes. */
  undoSwipe: () =>
    apiRequest<UndoSwipeResult>('/me/discovery/swipes/undo', undoSwipeResultSchema, {
      method: 'POST',
    }),
};
