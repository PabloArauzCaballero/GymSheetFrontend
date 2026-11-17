import { z } from 'zod';
import { notificationStatuses } from '@gymsheet/types';

/**
 * In-app notice of `GET /notifications/me`. The backend exposes only
 * `metadata.type` as `tipo` (and its refs) so a client knows where a notice
 * opens; the rest of the metadata stays internal.
 */
export const notificationSchema = z.object({
  id: z.string().uuid(),
  membresiaId: z.string().uuid().nullable(),
  canal: z.enum(['IN_APP', 'HTTP_GATEWAY', 'MOCK']),
  asunto: z.string(),
  mensaje: z.string(),
  diasRestantes: z.number().int().nullable(),
  estado: z.enum(notificationStatuses),
  leidoEn: z.string().nullable(),
  enviadoEn: z.string().nullable(),
  creadoEn: z.string(),
  /** `metadata.type`; null (or absent on older payloads) for plain notices. */
  tipo: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
});

/** Notice types of the account data export (`account-export.service.ts`). */
export const ACCOUNT_EXPORT_READY = 'ACCOUNT_EXPORT_READY';
export const ACCOUNT_EXPORT_FAILED = 'ACCOUNT_EXPORT_FAILED';
export const accountExportNoticeTypes = [ACCOUNT_EXPORT_READY, ACCOUNT_EXPORT_FAILED] as const;
export type AccountExportNoticeType = (typeof accountExportNoticeTypes)[number];
