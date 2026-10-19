import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

/** Postgres devuelve `numeric` como texto en las consultas directas. */
const nullableNumber = z
  .union([z.number(), z.string()])
  .nullable()
  .transform((value) => (value === null ? null : Number(value)));

export const moderationStates = ['VISIBLE', 'OCULTA_AUTO', 'OCULTA_MODERACION'] as const;
export type RoutineModerationState = (typeof moderationStates)[number];

export const MODERATION_STATE_LABEL: Record<RoutineModerationState, string> = {
  VISIBLE: 'Visible',
  OCULTA_AUTO: 'Oculta automáticamente',
  OCULTA_MODERACION: 'Oculta por moderación',
};

export const adminRoutineSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  visibilidad: z.string(),
  esOficial: z.boolean(),
  estado: z.string(),
  estadoModeracion: z.enum(moderationStates),
  version: z.number().int(),
  copias: z.number().int(),
  valoracionPromedio: nullableNumber,
  valoracionTotal: z.number().int(),
  publicadaEn: z.string().nullable(),
  autorId: z.string().uuid(),
  autorNombre: z.string(),
  denunciasAbiertas: z.number().int(),
});
export type AdminRoutine = z.infer<typeof adminRoutineSchema>;

export const adminRoutinePageSchema = z.object({
  items: z.array(adminRoutineSchema),
  siguienteCursor: z.string().nullable(),
});

export const routineInsightsSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  version: z.number().int(),
  copias: z.number().int(),
  activaciones: z.number().int(),
  valoracionPromedio: nullableNumber,
  valoracionTotal: z.number().int(),
  comentarios: z.number().int(),
  denuncias: z.number().int(),
  copiasVivas: z.number().int(),
});
export type RoutineInsights = z.infer<typeof routineInsightsSchema>;

export type AdminRoutineFilters = {
  oficial?: boolean;
  estadoModeracion?: RoutineModerationState;
  q?: string;
  cursor?: string;
};

/** Un ejercicio dentro de un día, tal como lo espera `POST /admin/routines`. */
export type OfficialExerciseInput = {
  ejercicioId: string;
  seriesObjetivo: number;
  repsMin: number | null;
  repsMax: number | null;
};

export type OfficialDayInput = {
  diaSemana: number | null;
  nombre: string | null;
  ejercicios: OfficialExerciseInput[];
};

export type CreateOfficialInput = {
  nombre: string;
  descripcion: string | null;
  dias: OfficialDayInput[];
};

const createdSchema = z.object({ id: z.string().uuid() });

export function adminRoutinesPath(filters: AdminRoutineFilters): string {
  const query = new URLSearchParams({ limit: '20' });
  if (filters.oficial !== undefined) query.set('oficial', String(filters.oficial));
  if (filters.estadoModeracion) query.set('estadoModeracion', filters.estadoModeracion);
  if (filters.q) query.set('q', filters.q);
  if (filters.cursor) query.set('cursor', filters.cursor);
  return `/admin/routines?${query.toString()}`;
}

export const routinesReppService = {
  list: (filters: AdminRoutineFilters) =>
    apiRequest(adminRoutinesPath(filters), adminRoutinePageSchema, { method: 'GET' }),

  insights: (id: string) =>
    apiRequest(`/admin/routines/${id}/insights`, routineInsightsSchema, { method: 'GET' }),

  markOfficial: (id: string) =>
    apiRequest(`/admin/routines/${id}/official`, createdSchema, { method: 'POST' }),

  unmarkOfficial: (id: string) =>
    apiRequest(`/admin/routines/${id}/official`, createdSchema, { method: 'DELETE' }),

  createOfficial: (input: CreateOfficialInput) =>
    apiRequest('/admin/routines', createdSchema, { method: 'POST', body: input }),
};
