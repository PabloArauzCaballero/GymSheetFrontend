import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

export const adminPermissionDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  domain: z.string(),
});

export const adminUserPermissionGrantSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  permissionKey: z.string(),
  grantedByUserId: z.string().uuid().nullable(),
  grantedAt: z.string(),
  expiresAt: z.string().nullable(),
});

export type AdminPermissionDefinition = z.infer<typeof adminPermissionDefinitionSchema>;
export type AdminUserPermissionGrant = z.infer<typeof adminUserPermissionGrantSchema>;

export const permissionsAdminService = {
  catalog: () =>
    apiRequest('/admin/permissions/catalog', z.array(adminPermissionDefinitionSchema), {
      method: 'GET',
    }),
  listForUser: (userId: string) =>
    apiRequest(`/admin/permissions/${userId}`, z.array(adminUserPermissionGrantSchema), {
      method: 'GET',
    }),
  grant: (userId: string, input: { permissionKey: string; expiresAt: string | null }) =>
    apiRequest(`/admin/permissions/${userId}`, adminUserPermissionGrantSchema, {
      method: 'POST',
      body: input,
    }),
  revoke: (userId: string, permissionKey: string) =>
    apiRequest(
      `/admin/permissions/${userId}/${encodeURIComponent(permissionKey)}`,
      z.object({ revoked: z.boolean() }),
      { method: 'DELETE' },
    ),
};
