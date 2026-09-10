import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type { Connection, ConnectionStatus, GymDirectoryEntry, SocialStatusState } from '@/shared/api/schemas';
import { connectionSchema, gymDirectoryEntrySchema, socialStatusSchema } from '@/shared/api/schemas';

export type DirectoryFilters = {
  objetivo?: string;
  sucursalId?: string;
  limit?: number;
};

function queryString(filters: Record<string, string | number | undefined>) {
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
      `/me/gym-directory?${queryString(filters)}`,
      z.array(gymDirectoryEntrySchema),
    ),
};
