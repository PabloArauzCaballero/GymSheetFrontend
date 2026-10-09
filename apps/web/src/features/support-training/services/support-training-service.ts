import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

/** Postgres devuelve `numeric` como texto en las consultas directas. */
const numeric = z.union([z.number(), z.string()]).transform(Number);

const goalSchema = z.object({
  ejercicioNombre: z.string().nullable(),
  pesoTrabajoKg: z.number(),
  pesoSugeridoKg: z.number(),
  repsMin: z.number().int(),
  repsMax: z.number().int(),
});

export const programWeekSchema = z.object({
  numero: z.number().int(),
  inicio: z.string(),
  esDescarga: z.boolean(),
  sesionesPlan: z.number().int(),
  sesionesHechas: z.number().int(),
  cardioMinutos: z.number().int(),
  /** `null` mientras la semana no se ha cerrado. */
  cumplida: z.boolean().nullable(),
  multiplicador: z.number().nullable(),
  cerradaEn: z.string().nullable(),
});
export type ProgramWeek = z.infer<typeof programWeekSchema>;

export const rewardEntrySchema = z.object({
  semana: z.number().int(),
  motivo: z.string(),
  multiplicador: numeric,
  puntosBase: z.number().int(),
  puntosBonus: z.number().int(),
  creadoEn: z.string(),
});

export const supportProgramSchema = z.object({
  id: z.string().uuid(),
  carril: z.string(),
  modo: z.string(),
  estado: z.string(),
  motivoCierre: z.string().nullable(),
  rutinaNombre: z.string().nullable(),
  fechaInicio: z.string(),
  fechaFinPrevista: z.string(),
  semanaActual: z.number().int().nullable(),
  semanasTotales: z.number().int(),
  multiplicador: z.number(),
  metas: z.array(goalSchema),
  semanas: z.array(programWeekSchema),
  bonos: z.array(rewardEntrySchema),
});
export type SupportProgram = z.infer<typeof supportProgramSchema>;

export const supportTrainingSchema = z.object({
  usuarioId: z.string().uuid(),
  puntosDeModo: z.number().int(),
  rutinas: z.object({
    total: z.number().int(),
    publicas: z.number().int(),
    ocultas: z.number().int(),
  }),
  programas: z.array(supportProgramSchema),
  invitaciones: z.array(
    z.object({
      id: z.string().uuid(),
      estado: z.string(),
      origen: z.string().nullable(),
      creadaEn: z.string(),
      rutinaNombre: z.string(),
      deParte: z.string(),
    }),
  ),
  ultimasSesiones: z.array(
    z.object({
      id: z.string().uuid(),
      inicio: z.string(),
      fin: z.string().nullable(),
      estado: z.string(),
      programaId: z.string().uuid().nullable(),
      series: z.number().int(),
    }),
  ),
});
export type SupportTraining = z.infer<typeof supportTrainingSchema>;

export const recomputeReasons = [
  'CUMPLIDA',
  'YA_CUMPLIDA',
  'SIGUE_SIN_CUMPLIR',
  'SEMANA_ABIERTA',
  'SEMANA_NO_ENCONTRADA',
] as const;

export const recomputeResultSchema = z.object({
  recalculada: z.boolean(),
  motivo: z.enum(recomputeReasons),
  multiplicador: z.number().optional(),
  bono: z.number().int().optional(),
});
export type RecomputeResult = z.infer<typeof recomputeResultSchema>;

export const supportTrainingService = {
  training: (userId: string) =>
    apiRequest(`/admin/support/users/${userId}/training`, supportTrainingSchema, { method: 'GET' }),

  recomputeWeek: (programId: string, semana: number) =>
    apiRequest(`/admin/support/programs/${programId}/recompute-week`, recomputeResultSchema, {
      method: 'POST',
      body: { semana },
    }),
};
