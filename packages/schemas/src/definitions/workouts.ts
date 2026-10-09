import { z } from 'zod';
import { workoutStatuses } from '@gymsheet/types';
import { exerciseSchema } from './core';
import { sessionRewardSchema } from './progression';

export const workoutSetSchema = z.object({
  id: z.string().uuid(),
  numeroSerie: z.number().int(),
  /** `FUERZA` si la respuesta es de un backend anterior al cardio. */
  tipoSerie: z.enum(['FUERZA', 'CARDIO']).optional().default('FUERZA'),
  /** Nulos en las series de cardio: ninguna suma de kilos puede asumir que existen. */
  repeticiones: z.number().int().nullable(),
  pesoKg: z.number().nullable(),
  rir: z.number().int().nullable(),
  duracionSeg: z.number().int().nullable().optional().transform((v) => v ?? null),
  distanciaM: z.number().int().nullable().optional().transform((v) => v ?? null),
  fcMedia: z.number().int().nullable().optional().transform((v) => v ?? null),
  rpe: z.number().int().nullable().optional().transform((v) => v ?? null),
  descansoSegAnterior: z.number().int(),
  fechaRegistro: z.string(),
});

export const workoutExerciseSchema = z.object({
  id: z.string().uuid(),
  orden: z.number().int(),
  esEnfasis: z.boolean(),
  nota: z.string().nullable(),
  ejercicio: exerciseSchema.nullable(),
  series: z.array(workoutSetSchema),
});

export const workoutSchema = z.object({
  id: z.string().uuid(),
  usuarioId: z.string().uuid(),
  fechaInicio: z.string(),
  fechaFin: z.string().nullable(),
  estado: z.enum(workoutStatuses),
  observacion: z.string().nullable(),
  geoVerificada: z.boolean(),
  ejercicios: z.array(workoutExerciseSchema),
});

/**
 * Respuesta de cerrar una sesión: la sesión y lo que movió en la senda.
 * `progression` es nulo si el servidor no pudo calcularlo; la sesión se cerró igual.
 */
export const workoutFinishSchema = workoutSchema.extend({
  progression: sessionRewardSchema.nullable().optional().transform((value) => value ?? null),
});
export type WorkoutFinish = z.infer<typeof workoutFinishSchema>;
