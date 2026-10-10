import { z } from 'zod';
import { routineGroupTypes, workoutStatuses } from '@gymsheet/types';
import { exerciseSchema } from './core';
import { cardioSessionExtrasSchema } from '../cardio';
import { programSessionExtrasSchema } from '../programs';
import { sessionRewardSchema } from './progression';

export const workoutSetSchema = z.object({
  id: z.string().uuid(),
  numeroSerie: z.number().int(),
  tipoSerie: z.enum(['FUERZA', 'CARDIO']).default('FUERZA'),
  repeticiones: z.number().int().nullable(),
  pesoKg: z.number().nullable(),
  rir: z.number().int().nullable(),
  duracionSeg: z.number().int().nullable().default(null),
  distanciaM: z.number().int().nullable().default(null),
  fcMedia: z.number().int().nullable().default(null),
  rpe: z.number().int().nullable().default(null),
  descansoSegAnterior: z.number().int(),
  fechaRegistro: z.string(),
});

export const workoutExerciseSchema = z.object({
  id: z.string().uuid(),
  orden: z.number().int(),
  esEnfasis: z.boolean(),
  nota: z.string().nullable(),
  // Objetivo copiado de la rutina al empezar (C3.a); `null` si se añadió a mano o en
  // una respuesta anterior a M-C3.
  seriesObjetivo: z.number().int().nullable().default(null),
  repsMin: z.number().int().nullable().default(null),
  repsMax: z.number().int().nullable().default(null),
  pesoObjetivoKg: z.number().nullable().default(null),
  rirObjetivo: z.number().int().nullable().default(null),
  descansoSeg: z.number().int().nullable().default(null),
  descansoEntreSeg: z.number().int().nullable().default(null),
  duracionSeg: z.number().int().nullable().default(null),
  grupo: z.number().int().nullable().default(null),
  grupoTipo: z.enum(routineGroupTypes).nullable().default(null),
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
  /** Presente si la sesión nació de un programa de pesas con rutina (RF-14..16, RF-20). */
  programa: programSessionExtrasSchema.nullable().optional().transform((value) => value ?? null),
  /** Presente si la sesión tuvo series de cardio y hay un programa de cardio activo (RF-17). */
  cardio: cardioSessionExtrasSchema.nullable().optional().transform((value) => value ?? null),
});
export type WorkoutFinish = z.infer<typeof workoutFinishSchema>;
