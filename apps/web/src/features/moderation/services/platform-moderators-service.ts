import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

/** One member of the REPP moderation team (`GET /admin/platform/moderators`). */
export const platformModeratorSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  nombreCompleto: z.string(),
  estado: z.string(),
});
export type PlatformModerator = z.infer<typeof platformModeratorSchema>;

export const moderatorsKey = ['sistema', 'moderators'] as const;

/** SYSTEM_ADMIN only (ADR-0018); every change is audited by the backend. */
export const platformModeratorsService = {
  list: () =>
    apiRequest('/admin/platform/moderators', z.array(platformModeratorSchema), { method: 'GET' }),
  assign: (userId: string) =>
    apiRequest(`/admin/platform/moderators/${userId}`, platformModeratorSchema, { method: 'PUT' }),
  revoke: (userId: string) =>
    apiRequest(`/admin/platform/moderators/${userId}`, z.null(), { method: 'DELETE' }),
};
