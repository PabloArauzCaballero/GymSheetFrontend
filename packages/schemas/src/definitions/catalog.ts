import { z } from 'zod';
import { trainingGoals } from '@gymsheet/types';
import { routineAttributionSchema } from './training';

/** Pestañas del catálogo de rutinas (`GET /routines?scope=`). */
export const routineScopes = ['public', 'official', 'mine', 'shared'] as const;
export type RoutineScope = (typeof routineScopes)[number];

export const routineOrders = ['recientes', 'valoradas', 'populares'] as const;
export type RoutineOrder = (typeof routineOrders)[number];

export const routineInvitationSchema = z.object({
  id: z.string().uuid(),
  estado: z.string(),
  origen: z.string(),
  deParte: z.object({ id: z.string(), nombre: z.string() }),
});

/**
 * Tarjeta del catálogo. Una invitación pendiente trae `invitacion` y
 * `ejerciciosTotal: null`: sin ejercicios visibles hasta aceptar.
 */
export const routineCardSchema = z.object({
  id: z.string().uuid(),
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
  atribucion: routineAttributionSchema.nullable(),
  valoracion: z.object({ promedio: z.number().nullable(), total: z.number().int() }),
  copias: z.number().int(),
  publicadaEn: z.string().nullable(),
  version: z.number().int(),
  estadoModeracion: z.string(),
  dias: z.array(
    z.object({
      diaSemana: z.number().int().nullable(),
      nombre: z.string().nullable(),
      ejerciciosTotal: z.number().int().nullable(),
    }),
  ),
  invitacion: routineInvitationSchema.nullable(),
});
export type RoutineCard = z.infer<typeof routineCardSchema>;

export const routineCatalogPageSchema = z.object({
  items: z.array(routineCardSchema),
  siguienteCursor: z.string().nullable(),
});
export type RoutineCatalogPage = z.infer<typeof routineCatalogPageSchema>;

export type RoutineCatalogFilters = {
  scope: RoutineScope;
  q?: string;
  objetivo?: (typeof trainingGoals)[number];
  diasPorSemana?: number;
  deMiGimnasio?: boolean;
  orden?: RoutineOrder;
  cursor?: string | null;
  limit?: number;
};
