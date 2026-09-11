import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  DiscoveryPassEntry,
  InteractionCounts,
  LikeReceived,
  LikeSent,
} from '@/shared/api/schemas';
import {
  discoveryPassEntrySchema,
  interactionCountsSchema,
  likeReceivedSchema,
  likeSentSchema,
} from '@/shared/api/schemas';
import { directoryQueryString } from '@/features/social/services/social-service';

const deletedSchema = z.object({ deleted: z.literal(true) });

/**
 * Interacciones: quién me dio like, a quién se lo di, quién me descartó y a
 * quién descarté, más los contadores de cabecera.
 *
 * Las cuatro listas devuelven la misma ficha que la baraja (`gymDirectoryEntry`)
 * más la fecha de la interacción, así que en la UI se pintan con una sola
 * tarjeta y no con cuatro variantes que acabarían divergiendo.
 */
export const interactionsService = {
  likesReceived: (limit?: number) =>
    apiRequest<LikeReceived[]>(
      `/me/interactions/likes-received?${directoryQueryString({ limit })}`,
      z.array(likeReceivedSchema),
    ),
  likesSent: (limit?: number) =>
    apiRequest<LikeSent[]>(
      `/me/interactions/likes-sent?${directoryQueryString({ limit })}`,
      z.array(likeSentSchema),
    ),
  passesReceived: (limit?: number) =>
    apiRequest<DiscoveryPassEntry[]>(
      `/me/interactions/passes-received?${directoryQueryString({ limit })}`,
      z.array(discoveryPassEntrySchema),
    ),
  passesSent: (limit?: number) =>
    apiRequest<DiscoveryPassEntry[]>(
      `/me/interactions/passes-sent?${directoryQueryString({ limit })}`,
      z.array(discoveryPassEntrySchema),
    ),
  /** Deshace un descarte propio: esa persona vuelve a la baraja. */
  undoPass: (userId: string) =>
    apiRequest(`/me/interactions/passes/${userId}`, deletedSchema, { method: 'DELETE' }),
  counts: () => apiRequest<InteractionCounts>('/me/interactions/counts', interactionCountsSchema),
};

/**
 * Claves de caché locales a la feature.
 *
 * No van en `@gymsheet/hooks` —donde vive `queryKeys`— porque ese paquete es
 * territorio compartido con el móvil y esta tanda de pantallas es sólo de web:
 * añadirlas allí desde aquí obligaría a coordinar dos apps para un cambio de
 * caché de una.
 */
export const interactionKeys = {
  counts: ['interactions', 'counts'] as const,
  likesReceived: ['interactions', 'likes-received'] as const,
  likesSent: ['interactions', 'likes-sent'] as const,
  passesReceived: ['interactions', 'passes-received'] as const,
  passesSent: ['interactions', 'passes-sent'] as const,
  profileViews: ['profile-views', 'list'] as const,
  profileViewsSummary: ['profile-views', 'summary'] as const,
};
