import { routineRecommendationsSchema } from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

/** Por defecto, la tarjeta héroe y dos alternativas (C8.3.4). */
export const DEFAULT_RECOMMENDATION_LIMIT = 3;

/** Rutinas recomendadas según el objetivo y el onboarding (C7). */
export function createRecommendationServices(request: RequestFn) {
  return {
    /** `GET /routines/recommended?limit=N` → `[{ rutina, motivo }]`. */
    recommended: (limit: number = DEFAULT_RECOMMENDATION_LIMIT) =>
      request(
        `/routines/recommended?limit=${Math.max(1, Math.trunc(limit))}`,
        routineRecommendationsSchema,
        { method: 'GET' },
      ),
  };
}

export type RecommendationServices = ReturnType<typeof createRecommendationServices>;
