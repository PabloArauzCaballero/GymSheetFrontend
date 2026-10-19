import { z } from 'zod';
import {
  exerciseLikeResultSchema,
  exercisePreferenceResultSchema,
  routineCalendarSchema,
  routineSchema,
  routineWeekOverrideSchema,
} from '@gymsheet/schemas';
import type {
  CreateRoutineWithDaysInput,
  RoutineStructureInput,
  RoutineWeekOverrideInput,
} from '@gymsheet/types';
import type { RequestOptions } from './client';

/**
 * Lo único que estos servicios necesitan del transporte: `apiClient.request` en
 * el móvil y `apiRequest` en la web (BFF) tienen esta misma firma, de modo que
 * los dos clientes llaman a los mismos endpoints con los mismos contratos.
 */
export type RequestFn = <T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestOptions,
) => Promise<T>;

const deletedSchema = z.object({ deleted: z.literal(true) });

/** Rutinas con días (F1 del plan Rutinas REPP): crear, reemplazar estructura y calendario. */
export function createRoutineServices(request: RequestFn) {
  return {
    get: (id: string) => request(`/routines/${id}`, routineSchema, { method: 'GET' }),
    /** `POST /routines` con `dias`, `duracionSemanas` y `progresion`. */
    createWithDays: (input: CreateRoutineWithDaysInput) =>
      request('/routines', routineSchema, { method: 'POST', body: input }),
    /** `PUT /routines/:id/structure`: reemplaza días y ejercicios en una transacción. */
    replaceStructure: (id: string, input: RoutineStructureInput) =>
      request(`/routines/${id}/structure`, routineSchema, {
        method: 'PUT',
        body: input,
      }),
    /** Semanas generadas por la progresión (semana base + descarga). */
    calendar: (id: string, semanas?: number) =>
      request(
        `/routines/${id}/calendar${semanas === undefined ? '' : `?semanas=${semanas}`}`,
        routineCalendarSchema,
        { method: 'GET' },
      ),
    setWeek: (id: string, semana: number, input: RoutineWeekOverrideInput) =>
      request(`/routines/${id}/weeks/${semana}`, routineWeekOverrideSchema, {
        method: 'PUT',
        body: input,
      }),
    clearWeek: (id: string, semana: number) =>
      request(`/routines/${id}/weeks/${semana}`, deletedSchema, {
        method: 'DELETE',
      }),
  };
}

/** Favorito (privado) y me gusta (público con contador) de un ejercicio (D7). */
export function createExerciseCommunityServices(request: RequestFn) {
  return {
    /** Idempotente: dar «me gusta» dos veces deja uno solo. */
    like: (exerciseId: string) =>
      request(`/exercises/${exerciseId}/like`, exerciseLikeResultSchema, {
        method: 'POST',
      }),
    unlike: (exerciseId: string) =>
      request(`/exercises/${exerciseId}/like`, exerciseLikeResultSchema, {
        method: 'DELETE',
      }),
    setFavorite: (exerciseId: string, isFavorite: boolean) =>
      request(`/me/exercises/${exerciseId}/preference`, exercisePreferenceResultSchema, {
        method: 'PUT',
        body: { isFavorite },
      }),
  };
}

export type RoutineServices = ReturnType<typeof createRoutineServices>;
export type ExerciseCommunityServices = ReturnType<typeof createExerciseCommunityServices>;
