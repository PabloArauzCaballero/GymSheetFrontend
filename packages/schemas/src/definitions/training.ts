import { z } from 'zod';
import {
  routineAssignmentStatuses,
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
  ejercicio: exerciseSchema.nullable(),
});

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
  version: z.number().int(),
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
