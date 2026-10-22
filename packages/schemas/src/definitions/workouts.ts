import { z } from 'zod';
import { routineGroupTypes, skipReasons, swapReasons, workoutStatuses } from '@gymsheet/types';
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

/** Motivo desconocido (un cliente viejo frente a un servidor nuevo) → «Otro»: nunca rompe la sesión. */
const skipReasonSchema = z.enum(skipReasons).catch('OTRO');

export const skippedSetSchema = z.object({
  id: z.string(),
  numeroSerie: z.number().int(),
  motivo: skipReasonSchema,
  nota: z.string().nullable().default(null),
  fechaRegistro: z.string(),
});

export const omittedMarkSchema = z.object({
  motivo: skipReasonSchema,
  nota: z.string().nullable().default(null),
  fecha: z.string(),
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
  // D1: ausentes mientras el servidor no tenga el contrato de la noche del 13/10.
  saltadas: z.array(skippedSetSchema).optional().default([]),
  omitido: omittedMarkSchema.nullable().optional().default(null),
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
  rutinaId: z.string().nullable().optional().default(null),
  rutinaDiaId: z.string().nullable().optional().default(null),
});

/** `GET /workouts/:id/routine-link`: si «Guardar en mi rutina» está disponible. */
export const workoutRoutineLinkSchema = z.object({
  rutinaId: z.string().nullable().default(null),
  rutinaDiaId: z.string().nullable().default(null),
  nombre: z.string().nullable().default(null),
  editable: z.boolean().default(false),
});

/** `PATCH /workouts/:id/rest-settings`. */
export const restSettingsResultSchema = z.object({
  sesion: workoutSchema,
  rutina: z
    .object({
      guardado: z.boolean().default(false),
      rutinaId: z.string().nullable().default(null),
      ejerciciosActualizados: z.number().int().default(0),
      motivo: z.string().nullable().default(null),
    })
    .optional()
    .default({ guardado: false, rutinaId: null, ejerciciosActualizados: 0, motivo: null }),
});

/** `POST /workouts/libre`: la sesión propuesta y qué se pidió. */
export const freeWorkoutSchema = workoutSchema.extend({
  rutinaLibre: z
    .object({
      grupos: z.array(z.string()).default([]),
      propuestos: z.number().int().default(0),
      cuerpoCompleto: z.boolean().default(false),
    })
    .optional()
    .default({ grupos: [], propuestos: 0, cuerpoCompleto: false }),
});
export type FreeWorkout = z.infer<typeof freeWorkoutSchema>;

/** `GET /workouts/session-exercises/:id/alternatives`: equivalentes ya ordenados. */
export const exerciseAlternativesSchema = z.object({
  ejercicioId: z.string(),
  motivo: z.enum(swapReasons).nullable().catch(null).default(null),
  alternativas: z.array(
    z.object({
      id: z.string().uuid(),
      nombre: z.string(),
      grupoMuscular: z.string(),
      equipo: z.string().nullable().default(null),
      imagenUrl: z.string().nullable().default(null),
      musculosPrincipalesCompartidos: z.number().int().default(0),
    }),
  ),
});
export type ExerciseAlternatives = z.infer<typeof exerciseAlternativesSchema>;
export type ExerciseAlternative = ExerciseAlternatives['alternativas'][number];

/** `POST /workouts/session-exercises/:id/swap`. */
export const exerciseSwapResultSchema = z.object({
  sesion: workoutSchema,
  sesionEjercicioId: z.string(),
  conservoSeries: z.boolean().default(false),
  rutina: z.object({
    guardado: z.boolean().default(false),
    rutinaId: z.string().nullable().default(null),
    motivo: z.string().nullable().default(null),
  }),
});
export type ExerciseSwapResult = z.infer<typeof exerciseSwapResultSchema>;

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
