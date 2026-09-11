import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type { ProfileViewersPage, ProfileViewsSummary } from '@/shared/api/schemas';
import { profileViewersPageSchema, profileViewsSummarySchema } from '@/shared/api/schemas';
import { directoryQueryString } from '@/features/social/services/social-service';

/** «Quién vio mi perfil»: registro append-only, agregado por espectador. */
export const profileViewsService = {
  /** Registra que miré el perfil de alguien. Lo llama la ficha al abrirse. */
  record: (viewedUserId: string) =>
    apiRequest('/me/profile-views', z.object({ recorded: z.literal(true) }), {
      method: 'POST',
      body: { viewedUserId },
    }),
  summary: () => apiRequest<ProfileViewsSummary>('/me/profile-views/summary', profileViewsSummarySchema),
  /**
   * Una fila por persona, no por visita.
   *
   * Paginado por cursor y no por número de página: la lista crece por delante,
   * y con `OFFSET` una visita nueva mientras se pagina desplaza todo y repite
   * filas que ya se leyeron.
   */
  list: (params: { limit?: number; cursor?: string } = {}) =>
    apiRequest<ProfileViewersPage>(
      `/me/profile-views?${directoryQueryString({ limit: params.limit, cursor: params.cursor })}`,
      profileViewersPageSchema,
    ),
  /** Marca la lista como revisada: `newSinceLastCheck` vuelve a cero. */
  markChecked: () =>
    apiRequest('/me/profile-views/checked', z.object({ checked: z.literal(true) }), {
      method: 'POST',
    }),
};
