import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type { AccessCredential, AccessDecision, AccessEvent, Page } from '@/shared/api/contracts';
import {
  accessDecisionSchema,
  accessEventSchema,
  credentialSchema,
  pageSchema,
} from '@/shared/api/schemas';

export type AccessDevice = {
  id: string;
  puntoAccesoId: string;
  adapterKey: string;
  dispositivoExternoId: string;
  nombre: string;
  estado: 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE' | 'INACTIVE';
  vistoPorUltimaVezEn: string | null;
  metadata: Record<string, unknown>;
};

const accessDeviceSchema = z.object({
  id: z.string().uuid(),
  puntoAccesoId: z.string().uuid(),
  adapterKey: z.string(),
  dispositivoExternoId: z.string(),
  nombre: z.string(),
  estado: z.enum(['ACTIVE', 'MAINTENANCE', 'OFFLINE', 'INACTIVE']),
  vistoPorUltimaVezEn: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export const accessAdminService = {
  listDevices: () =>
    apiRequest<AccessDevice[]>('/admin/access/devices', z.array(accessDeviceSchema)),
  createDevice: (input: {
    puntoAccesoId: string;
    adapterKey: string;
    dispositivoExternoId: string;
    nombre: string;
    metadata?: Record<string, unknown>;
  }) =>
    apiRequest<AccessDevice>('/admin/access/devices', accessDeviceSchema, {
      method: 'POST',
      body: input,
    }),
  updateDeviceStatus: (id: string, estado: AccessDevice['estado']) =>
    apiRequest<AccessDevice>(`/admin/access/devices/${id}/status`, accessDeviceSchema, {
      method: 'PATCH',
      body: { estado },
    }),
  getEvent: (id: string) =>
    apiRequest<AccessEvent>(`/admin/access/events/${id}`, accessEventSchema),
  history: (page = 1, usuarioId?: string) =>
    apiRequest<Page<AccessDecision>>(
      `/admin/access/history?page=${page}&pageSize=25${usuarioId ? `&usuarioId=${encodeURIComponent(usuarioId)}` : ''}`,
      pageSchema(accessDecisionSchema),
    ),
  credentialsForUser: (userId: string) =>
    apiRequest<AccessCredential[]>(
      `/admin/access/credentials/user/${userId}`,
      z.array(credentialSchema),
    ),
  createPin: (input: { usuarioId: string; pin: string; proveedor?: string }) =>
    apiRequest<AccessCredential>('/admin/access/credentials/pin', credentialSchema, {
      method: 'POST',
      body: input,
    }),
  createExternalCredential: (input: {
    usuarioId: string;
    modalidad: 'FACE' | 'FINGERPRINT';
    proveedor: string;
    referenciaExterna: string;
    versionConsentimiento: string;
    consentimientoRegistradoEn: string;
    metadata?: Record<string, unknown>;
  }) =>
    apiRequest<AccessCredential>('/admin/access/credentials/external-reference', credentialSchema, {
      method: 'POST',
      body: input,
    }),
  revokeCredential: (id: string, motivo?: string | null) =>
    apiRequest<AccessCredential>(`/admin/access/credentials/${id}/revoke`, credentialSchema, {
      method: 'PATCH',
      body: { motivo },
    }),
};
