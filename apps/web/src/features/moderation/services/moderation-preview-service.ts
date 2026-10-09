import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

/**
 * Lo mínimo para enseñar el contenido denunciado junto al caso.
 *
 * El backend no devuelve una vista previa dentro del caso, así que se lee con
 * los endpoints que ya existen (`GET /routines/:id`, `GET /exercises/:id`) y el
 * alcance con el de insights de rutinas. Los esquemas piden sólo lo que se
 * pinta: el contenido completo cambia con el asistente de rutinas y no es
 * asunto de la cola.
 */
const dayExerciseSchema = z.object({
  seriesObjetivo: z.number().int(),
  repsMin: z.number().int().nullable(),
  repsMax: z.number().int().nullable(),
  ejercicio: z.object({ nombre: z.string() }),
});

export const routinePreviewSchema = z.object({
  nombre: z.string(),
  descripcion: z.string().nullable(),
  visibilidad: z.string(),
  dias: z
    .array(
      z.object({
        diaSemana: z.number().int().nullable(),
        nombre: z.string().nullable(),
        ejercicios: z.array(dayExerciseSchema),
      }),
    )
    .default([]),
});
export type RoutinePreview = z.infer<typeof routinePreviewSchema>;

/** «Alcance»: cuánta gente ya tiene esta rutina, que es lo que mide el daño. */
export const routineReachSchema = z.object({
  copias: z.number().int(),
  copiasVivas: z.number().int(),
  activaciones: z.number().int(),
  comentarios: z.number().int(),
  denuncias: z.number().int(),
});
export type RoutineReach = z.infer<typeof routineReachSchema>;

export const exercisePreviewSchema = z.object({
  nombre: z.string(),
  grupoMuscular: z.string().nullable(),
  descripcion: z.string().nullable(),
  instructions: z.record(z.string(), z.string()).default({}),
  media: z.array(z.object({ id: z.string() })).default([]),
});
export type ExercisePreview = z.infer<typeof exercisePreviewSchema>;

export const moderationPreviewService = {
  routine: (id: string) => apiRequest(`/routines/${id}`, routinePreviewSchema, { method: 'GET' }),
  routineReach: (id: string) =>
    apiRequest(`/admin/routines/${id}/insights`, routineReachSchema, { method: 'GET' }),
  exercise: (id: string) =>
    apiRequest(`/exercises/${id}`, exercisePreviewSchema, { method: 'GET' }),
};
