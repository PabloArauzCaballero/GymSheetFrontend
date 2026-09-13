import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  Connection,
  ConnectionStatus,
  GymDirectoryEntry,
  MemberProfile,
  SocialStatusState,
} from '@/shared/api/schemas';
import {
  connectionSchema,
  gymDirectoryEntrySchema,
  memberProfileSchema,
  socialStatusSchema,
} from '@/shared/api/schemas';

/**
 * Filtros del directorio. La baraja acepta los mismos: es el mismo catálogo
 * visto de otra forma — el directorio se recorre, la baraja se consume.
 *
 * `genero` y `q` no son añadidos de la web: el backend los valida desde el
 * principio en `directoryQuerySchema` y el móvil los manda. Faltaban aquí, así
 * que el portal pedía un subconjunto de lo que el servidor ya sabía filtrar.
 */
export type DirectoryFilters = {
  objetivo?: string;
  sucursalId?: string;
  /** `MALE` | `FEMALE`. El backend rechaza cualquier otro valor. */
  genero?: string;
  /** Búsqueda por nombre dentro del mismo gimnasio. */
  q?: string;
  limit?: number;
};

/**
 * Serializa filtros descartando los vacíos.
 *
 * Se exporta porque la baraja de descubrimiento acepta los mismos filtros que
 * el directorio: son el mismo catálogo, y duplicar el serializador es la forma
 * habitual de que dentro de un mes uno mande `limit=` vacío y el otro no.
 */
export function directoryQueryString(filters: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export const socialService = {
  listConnections: (status?: ConnectionStatus) =>
    apiRequest<Connection[]>(
      `/me/connections${status ? `?status=${status}` : ''}`,
      z.array(connectionSchema),
    ),
  sendConnection: (addresseeId: string) =>
    apiRequest<Connection>('/me/connections', connectionSchema, {
      method: 'POST',
      body: { addresseeId },
    }),
  respondConnection: (id: string, action: 'ACCEPT' | 'REJECT') =>
    apiRequest<Connection>(`/me/connections/${id}`, connectionSchema, {
      method: 'PATCH',
      body: { action },
    }),
  withdrawConnection: (id: string) =>
    apiRequest(`/me/connections/${id}`, z.object({ deleted: z.literal(true) }), {
      method: 'DELETE',
    }),
  getSocialStatus: () => apiRequest<SocialStatusState>('/me/social-status', socialStatusSchema),
  updateSocialStatus: (input: SocialStatusState) =>
    apiRequest<SocialStatusState>('/me/social-status', socialStatusSchema, {
      method: 'PATCH',
      body: input,
    }),
  directory: (filters: DirectoryFilters) =>
    apiRequest<GymDirectoryEntry[]>(
      `/me/gym-directory?${directoryQueryString(filters)}`,
      z.array(gymDirectoryEntrySchema),
    ),
  /** Ficha social de un socio del mismo gimnasio, con las insignias que ganó. */
  memberProfile: (userId: string) =>
    apiRequest<MemberProfile>(`/me/gym-directory/${userId}`, memberProfileSchema),
};
