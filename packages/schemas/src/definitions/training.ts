import { z } from 'zod';
import {
  routineAssignmentStatuses,
  routineStatuses,
  routineVisibilities,
  trainingGoals,
} from '@gymsheet/types';
import { exerciseSchema } from './core';

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

export const routineSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  creadoPorUsuarioId: z.string().uuid(),
  visibilidad: z.enum(routineVisibilities),
  objetivo: z.enum(trainingGoals).nullable(),
  estado: z.enum(routineStatuses),
  ejercicios: z.array(routineExerciseSchema),
  fechaCreacion: z.string(),
  fechaActualizacion: z.string(),
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
