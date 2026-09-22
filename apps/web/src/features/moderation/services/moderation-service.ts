import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

export const moderationTargetKinds = [
  'STORY',
  'PROFILE_PHOTO',
  'CHAT_MESSAGE',
  'USER',
] as const;
export type ModerationTargetKind = (typeof moderationTargetKinds)[number];

export const moderationReasons = [
  'CONTENIDO_SEXUAL',
  'ACOSO',
  'DISCURSO_DE_ODIO',
  'VIOLENCIA',
  'SPAM',
  'PERFIL_FALSO',
  'MENOR_DE_EDAD',
  'DROGAS',
  'OTRO',
] as const;
export type ModerationReason = (typeof moderationReasons)[number];

/** Cómo se dice cada motivo a una persona, no cómo lo guarda la base. */
export const REASON_LABEL: Record<ModerationReason, string> = {
  CONTENIDO_SEXUAL: 'Contenido sexual',
  ACOSO: 'Acoso o intimidación',
  DISCURSO_DE_ODIO: 'Discurso de odio',
  VIOLENCIA: 'Violencia o amenazas',
  SPAM: 'Spam o estafa',
  PERFIL_FALSO: 'Perfil falso o suplantación',
  MENOR_DE_EDAD: 'Parece una persona menor de edad',
  DROGAS: 'Drogas o sustancias ilegales',
  OTRO: 'Otro motivo',
};

export const TARGET_LABEL: Record<ModerationTargetKind, string> = {
  STORY: 'Story',
  PROFILE_PHOTO: 'Foto de perfil',
  CHAT_MESSAGE: 'Mensaje',
  USER: 'Perfil',
};

/**
 * Una tarjeta de la cola: un contenido con todas sus quejas juntas.
 *
 * El backend devuelve las columnas en snake_case porque salen de una consulta
 * agregada, no de un modelo. Se respeta tal cual en vez de traducirlas: el
 * esquema es el contrato, y renombrar aquí sólo añadiría un sitio donde los dos
 * lados pueden dejar de coincidir sin que nadie se entere.
 */
export const moderationCaseSchema = z.object({
  target_kind: z.enum(moderationTargetKinds),
  target_id: z.string().uuid(),
  reported_user_id: z.string().uuid(),
  reported_user_name: z.string(),
  report_count: z.number().int(),
  reporter_count: z.number().int(),
  reasons: z.array(z.enum(moderationReasons)),
  severity: z.number().int(),
  first_reported_at: z.string(),
  last_reported_at: z.string(),
  claimed_by_user_id: z.string().uuid().nullable(),
  claimed_by_name: z.string().nullable(),
  claimed_at: z.string().nullable(),
  content_hidden: z.boolean(),
});

export type ModerationCase = z.infer<typeof moderationCaseSchema>;

export const moderationCaseDetailSchema = z.object({
  targetKind: z.enum(moderationTargetKinds),
  targetId: z.string().uuid(),
  reportedUser: z.object({
    id: z.string().uuid(),
    name: z.string(),
    suspendedUntil: z.string().nullable(),
  }),
  reports: z.array(
    z.object({
      id: z.string().uuid(),
      reporterUserId: z.string().uuid(),
      reason: z.enum(moderationReasons),
      details: z.string().nullable(),
      createdAt: z.string(),
      status: z.string(),
    }),
  ),
  activeStrikes: z.number().int(),
  /** Qué sanción tocaría — calculada por el backend ANTES de decidir. */
  pendingSanction: z.object({
    kind: z.string(),
    days: z.number().int().nullable(),
  }),
  contentHidden: z.boolean(),
});

export type ModerationCaseDetail = z.infer<typeof moderationCaseDetailSchema>;

const resolveResultSchema = z.object({
  resolved: z.boolean(),
  reportsClosed: z.number().int(),
  sanction: z
    .object({ kind: z.string(), days: z.number().int().nullable() })
    .nullable(),
  contentHidden: z.boolean(),
});

const reportResultSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  contentHidden: z.boolean(),
});

function casePath(targetKind: ModerationTargetKind, targetId: string) {
  return `/admin/moderation/cases/${targetKind}/${targetId}`;
}

export const moderationService = {
  queue: (page = 1, pageSize = 20) =>
    apiRequest(
      `/admin/moderation/queue?page=${page}&pageSize=${pageSize}`,
      z.array(moderationCaseSchema),
      { method: 'GET' },
    ),

  getCase: (targetKind: ModerationTargetKind, targetId: string) =>
    apiRequest(casePath(targetKind, targetId), moderationCaseDetailSchema, {
      method: 'GET',
    }),

  claim: (targetKind: ModerationTargetKind, targetId: string) =>
    apiRequest(
      `${casePath(targetKind, targetId)}/claim`,
      z.object({ claimed: z.boolean(), reports: z.number().int() }),
      { method: 'POST' },
    ),

  release: (targetKind: ModerationTargetKind, targetId: string) =>
    apiRequest(
      `${casePath(targetKind, targetId)}/release`,
      z.object({ released: z.boolean() }),
      { method: 'POST' },
    ),

  resolve: (
    targetKind: ModerationTargetKind,
    targetId: string,
    input: { hideContent: boolean; sanction: boolean; note?: string },
  ) =>
    apiRequest(`${casePath(targetKind, targetId)}/resolve`, resolveResultSchema, {
      method: 'POST',
      body: input,
    }),

  /** Denuncia desde la aplicación; la usan las superficies de socio. */
  report: (input: {
    targetKind: ModerationTargetKind;
    targetId: string;
    reason: ModerationReason;
    details?: string;
  }) => apiRequest('/me/reports', reportResultSchema, { method: 'POST', body: input }),
};
