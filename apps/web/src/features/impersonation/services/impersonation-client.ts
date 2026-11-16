import { z } from 'zod';
import { startImpersonation, stopImpersonation } from '@/features/auth/services/auth-client';
import { apiRequest } from '@/shared/api/api-client';

/** One gym of the platform catalog (`GET /admin/tenants`, SYSTEM_ADMIN only). */
export const tenantSchema = z.object({ id: z.string(), nombre: z.string(), activo: z.boolean() });
export type Tenant = z.infer<typeof tenantSchema>;

export const tenantsKey = ['sistema', 'tenants'] as const;

/**
 * Impersonation runs through its own BFF route (`/api/auth/impersonation`),
 * not `/api/backend`: the scoped token never reaches this code.
 */
export const impersonationClient = {
  tenants: () => apiRequest('/admin/tenants', z.array(tenantSchema), { method: 'GET' }),
  start: startImpersonation,
  stop: stopImpersonation,
};
