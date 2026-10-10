import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

export const auditEntrySchema = z.object({
  id: z.string().uuid(),
  occurredAt: z.string(),
  actorUserId: z.string().uuid().nullable(),
  actorEmail: z.string(),
  actorRole: z.string(),
  /** Nulo = acción de plataforma, no de un gimnasio concreto. */
  tenantScope: z.string().nullable(),
  domain: z.string(),
  action: z.string(),
  targetKind: z.string().nullable(),
  targetId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export const auditPageSchema = z.object({
  items: z.array(auditEntrySchema),
  /** Opaco: se devuelve tal cual para pedir la página siguiente. */
  nextCursor: z.string().nullable(),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type AuditPage = z.infer<typeof auditPageSchema>;

export type AuditFilters = {
  domain?: string;
  action?: string;
  cursor?: string;
};

export const auditService = {
  list: (filters: AuditFilters = {}) => {
    const params = new URLSearchParams({ limit: '50' });
    if (filters.domain) params.set('domain', filters.domain);
    if (filters.action) params.set('action', filters.action);
    if (filters.cursor) params.set('cursor', filters.cursor);
    return apiRequest(`/admin/audit?${params.toString()}`, auditPageSchema, {
      method: 'GET',
    });
  },
};
