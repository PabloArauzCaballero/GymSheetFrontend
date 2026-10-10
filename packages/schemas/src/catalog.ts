import { z } from 'zod';
import { trainingGoals } from '@gymsheet/types';
import { ratingSummarySchema } from './definitions/core';

export const routineCardDaySchema = z.object({
  diaSemana: z.number().int().nullable(),
  nombre: z.string().nullable(),
  ejerciciosTotal: z.number().int().nullable(),
});

export const routineCardInvitationSchema = z.object({
  id: z.string(),
  estado: z.string(),
  origen: z.string(),
  deParte: z.object({ id: z.string(), nombre: z.string() }),
});

export const routineCardSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  objetivo: z.enum(trainingGoals).nullable(),
  duracionSemanas: z.number().int().nullable(),
  diasPorSemana: z.number().int(),
  ejerciciosTotal: z.number().int().nullable(),
  visibilidad: z.string(),
  esOficial: z.boolean(),
  esMia: z.boolean(),
  autor: z.object({ id: z.string(), nombre: z.string() }),
  atribucion: z
    .object({ routineName: z.string(), authorId: z.string().nullable(), authorName: z.string() })
    .nullable(),
  basadaEnRutinaId: z.string().nullable().optional(),
  numeroCopia: z.number().int().nullable().optional(),
  valoracion: ratingSummarySchema,
  copias: z.number().int(),
  publicadaEn: z.string().nullable(),
  version: z.number().int(),
  estadoModeracion: z.string(),
  dias: z.array(routineCardDaySchema),
  invitacion: routineCardInvitationSchema.nullable(),
});

export const routineCatalogPageSchema = z.object({
  items: z.array(routineCardSchema),
  siguienteCursor: z.string().nullable(),
});
