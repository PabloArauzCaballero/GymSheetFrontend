import { z } from 'zod';
import {
  routineAssignmentStatuses,
  routineExerciseLimits as limits,
  routineGroupTypes,
  routineStatuses,
  routineVisibilities,
  trainingGoals,
} from '@gymsheet/types';
import { exerciseSchema, ratingSummarySchema } from './core';

export const routineExerciseSchema = z.object({
  id: z.string().uuid(),
  orden: z.number().int(),
  seriesObjetivo: z.number().int(),
  repsMin: z.number().int().nullable(),
  repsMax: z.number().int().nullable(),
  pesoObjetivoKg: z.number().nullable(),
  rirObjetivo: z.number().int().nullable(),
  descansoSeg: z.number().int().nullable(),
  nota: z.string().nullable(),
  // Campos de C3.a. `default(null)` para leer sin romper una respuesta anterior a M-C3.
  grupo: z.number().int().nullable().default(null),
  grupoTipo: z.enum(routineGroupTypes).nullable().default(null),
  descansoEntreSeg: z.number().int().nullable().default(null),
  duracionSeg: z.number().int().nullable().default(null),
  ejercicio: exerciseSchema.nullable(),
});

/**
 * Un ejercicio de un día tal como se envía en `POST /routines` y
 * `PUT /routines/:id/structure`. Mismos topes que el backend (C3.a): series
 * 1–10, reps 1–50, bloque 1–30, transición 0–60 s y duración 1–3600 s. Con
 * duración, las repeticiones no se envían (el servidor las guarda `null`).
 */
export const routineDayExerciseInputSchema = z
  .object({
    ejercicioId: z.string().uuid(),
    seriesObjetivo: z
      .number()
      .int()
      .min(limits.seriesMin, `Mínimo ${limits.seriesMin} serie`)
      .max(limits.seriesMax, `Máximo ${limits.seriesMax} series`),
    repsMin: z
      .number()
      .int()
      .min(limits.repsMin, `Mínimo ${limits.repsMin} repetición`)
      .max(limits.repsMax, `Máximo ${limits.repsMax} repeticiones`)
      .nullable(),
    repsMax: z
      .number()
      .int()
      .min(limits.repsMin, `Mínimo ${limits.repsMin} repetición`)
      .max(limits.repsMax, `Máximo ${limits.repsMax} repeticiones`)
      .nullable(),
    pesoObjetivoKg: z.number().min(0).max(2000).nullable(),
    rirObjetivo: z.number().int().min(0).max(10).nullable(),
    descansoSeg: z.number().int().min(0).max(7200).nullable(),
    nota: z.string().max(1000).nullable(),
    grupo: z.number().int().min(1).max(limits.grupoMax).nullable().optional(),
    descansoEntreSeg: z
      .number()
      .int()
      .min(0)
      .max(limits.descansoEntreMax, `La transición admite hasta ${limits.descansoEntreMax} s`)
      .nullable()
      .optional(),
    duracionSeg: z
      .number()
      .int()
      .min(limits.duracionMin)
      .max(limits.duracionMax)
      .nullable()
      .optional(),
  })
  .refine(
    (value) =>
      value.repsMin === null || value.repsMax === null || value.repsMin <= value.repsMax,
    { path: ['repsMax'], message: 'El máximo de repeticiones no puede ser menor que el mínimo' },
  );

export const routineDaySchema = z.object({
  id: z.string().uuid(),
  diaSemana: z.number().int().min(1).max(7).nullable(),
  nombre: z.string().nullable(),
  orden: z.number().int(),
  ejercicios: z.array(routineExerciseSchema),
});

export const routineAttributionSchema = z.object({
  routineName: z.string(),
  authorId: z.string().nullable(),
  authorName: z.string(),
});

export const routineProgressionSchema = z.object({
  activa: z.boolean().optional(),
  descargaCada: z
    .union([z.literal(4), z.literal(5), z.literal(6)])
    .nullable()
    .optional(),
  volumenDescarga: z.number().optional(),
  cargaDescarga: z.number().optional(),
});

export const routineSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  creadoPorUsuarioId: z.string().uuid(),
  visibilidad: z.enum(routineVisibilities),
  objetivo: z.enum(trainingGoals).nullable(),
  estado: z.enum(routineStatuses),
  ejercicios: z.array(routineExerciseSchema),
  dias: z.array(routineDaySchema),
  duracionSemanas: z.number().int().nullable(),
  progresion: routineProgressionSchema,
  esOficial: z.boolean(),
  atribucion: routineAttributionSchema.nullable(),
  basadaEnRutinaId: z.string().nullable(),
  basadaEnVersion: z.number().int().nullable(),
  numeroCopia: z.number().int().nullable().default(null),
  version: z.number().int(),
  hayVersionNueva: z.boolean().default(false),
  huellaCorta: z.string().nullable(),
  valoracion: ratingSummarySchema,
  copias: z.number().int(),
  publicadaEn: z.string().nullable(),
  estadoModeracion: z.string(),
  esMia: z.boolean(),
  puedoEditar: z.boolean(),
  fechaCreacion: z.string(),
  fechaActualizacion: z.string(),
});

export const routineWeekSchema = z.object({
  numero: z.number().int(),
  esDescarga: z.boolean(),
  factorVolumen: z.number(),
  factorCarga: z.number(),
  nota: z.string().nullable(),
  dias: z.array(
    z.object({
      diaId: z.string(),
      diaSemana: z.number().int().nullable(),
      nombre: z.string().nullable(),
      ejercicios: z.array(
        z.object({
          routineExerciseId: z.string(),
          ejercicioId: z.string(),
          orden: z.number().int(),
          series: z.number().int(),
          repsMin: z.number().int().nullable(),
          repsMax: z.number().int().nullable(),
          pesoObjetivoKg: z.number().nullable(),
          descansoSeg: z.number().int().nullable().default(null),
          rirObjetivo: z.number().int().nullable().default(null),
          nota: z.string().nullable().default(null),
          grupo: z.number().int().nullable().default(null),
          grupoTipo: z.enum(routineGroupTypes).nullable().default(null),
          descansoEntreSeg: z.number().int().nullable().default(null),
          duracionSeg: z.number().int().nullable().default(null),
          pesoSugeridoKg: z.number().nullable().optional(),
        }),
      ),
    }),
  ),
});

export const routineCalendarSchema = z.object({
  rutinaId: z.string(),
  duracionSemanas: z.number().int().nullable(),
  progresion: routineProgressionSchema,
  semanas: z.array(routineWeekSchema),
});

export const routineWeekOverrideSchema = z.object({
  semana: z.number().int(),
  esDescarga: z.boolean(),
  factorVolumen: z.number(),
  factorCarga: z.number(),
  nota: z.string().nullable().optional().transform((v) => v ?? null),
});

export const exerciseLikeResultSchema = z.object({
  meGusta: z.boolean(),
  meGustaTotal: z.number().int(),
});

/** Respuesta de `PUT /me/exercises/:id/preference` (favorito privado, D7). */
export const exercisePreferenceResultSchema = z.object({
  ejercicioId: z.string(),
  favorito: z.boolean(),
  valoracionPersonal: z.number().int().nullable(),
  notas: z.string().nullable(),
});

export const routineAssignmentSchema = z.object({
  id: z.string().uuid(),
  rutinaId: z.string().uuid(),
  clienteUsuarioId: z.string().uuid(),
  asignadoPorUsuarioId: z.string().uuid(),
  estado: z.enum(routineAssignmentStatuses),
  fechaProgramada: z.string().nullable(),
  diasSemana: z.array(z.number().int()),
  nota: z.string().nullable(),
  clienteNombre: z.string().nullable(),
  clienteEmail: z.string().nullable(),
  rutina: routineSchema.nullable(),
  fechaCreacion: z.string(),
});

export const importRoutinesResponseSchema = z.object({
  creadas: z.number().int(),
  resultados: z.array(
    z.object({
      index: z.number().int(),
      nombre: z.string(),
      creada: z.boolean(),
      routineId: z.string().uuid().nullable(),
      error: z.string().nullable(),
    }),
  ),
});
