import { apiRequest } from '@/shared/api/api-client';
import {
  exerciseMusclesSchema,
  muscleCatalogEntrySchema,
  muscleExercisesPageSchema,
} from '@/shared/api/schemas';

/** Claves de caché de la figura: las mismas formas que usa el móvil. */
export const muscleKeys = {
  detail: (code: string) => ['muscle', code] as const,
  exercises: (code: string) => ['muscle', code, 'exercises'] as const,
  forExercise: (exerciseId: string) => ['exercise', exerciseId, 'muscles'] as const,
};

/**
 * Ficha de un músculo, sus ejercicios por rol (paginados) y los músculos que
 * trabaja un ejercicio. Mismos endpoints y esquemas que `muscleService` del
 * móvil; aquí pasan por el BFF (`/api/backend`), que guarda el token.
 */
export const muscleService = {
  get: (code: string) =>
    apiRequest(`/muscles/${encodeURIComponent(code)}`, muscleCatalogEntrySchema),
  exercises: (code: string, { limit, offset }: { limit: number; offset: number }) =>
    apiRequest(
      `/muscles/${encodeURIComponent(code)}/exercises?limit=${limit}&offset=${offset}`,
      muscleExercisesPageSchema,
    ),
  forExercise: (exerciseId: string) =>
    apiRequest(`/exercises/${encodeURIComponent(exerciseId)}/muscles`, exerciseMusclesSchema),
};
