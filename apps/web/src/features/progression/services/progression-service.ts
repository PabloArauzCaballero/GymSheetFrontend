import { apiRequest } from '@/shared/api/api-client';
import {
  leaderboardSchema,
  muscleEquipmentInferenceSchema,
  pointRulesSchema,
  prizeListSchema,
  progressionAcknowledgedSchema,
  progressionSchema,
  restDaysSchema,
} from '@/shared/api/schemas';
import type {
  LeaderboardEntry,
  LeaderboardSortBy,
  MuscleEquipmentInference,
  PointRules,
  Prize,
  Progression,
  RestDays,
} from '@/shared/api/schemas';

/**
 * La senda, vista desde la web.
 *
 * Consume los mismos contratos que el móvil (`@gymsheet/schemas`), así que un
 * cambio en el backend rompe la validación en ambos clientes a la vez en vez de
 * dejar uno silenciosamente desactualizado.
 */
export const progressionService = {
  get: () => apiRequest<Progression>('/me/progression', progressionSchema),
  /** Cuánto vale cada cosa. Lo publica el servidor para no copiarlo aquí. */
  rules: () => apiRequest<PointRules>('/me/progression/rules', pointRulesSchema),
  acknowledge: () =>
    apiRequest('/me/progression/acknowledge', progressionAcknowledgedSchema, { method: 'POST' }),
  /** Los cupones del socio (los mismos que `prizes` de la senda). */
  prizes: () => apiRequest<Prize[]>('/me/progression/prizes', prizeListSchema),
  leaderboard: (limit = 10, sortBy: LeaderboardSortBy = 'points') =>
    apiRequest<LeaderboardEntry[]>(
      `/me/progression/leaderboard?limit=${limit}&sortBy=${sortBy}`,
      leaderboardSchema,
    ),
  getRestDays: () => apiRequest<RestDays>('/me/progression/rest-days', restDaysSchema),
  setRestDays: (weekdays: number[]) =>
    apiRequest<RestDays>('/me/progression/rest-days', restDaysSchema, {
      method: 'PATCH',
      body: { weekdays },
    }),
  /** Canjea puntos por un strike mensual para proteger la racha. */
  buyStrike: () =>
    apiRequest<Progression>('/me/progression/strikes/buy', progressionSchema, {
      method: 'POST',
    }),
};

/** Ejercicios propios: se elige el músculo y el servidor deduce la máquina. */
export const personalExerciseService = {
  suggestEquipment: (muscleCode: string) =>
    apiRequest<MuscleEquipmentInference>(
      `/exercises/equipment-suggestion?muscle=${encodeURIComponent(muscleCode)}`,
      muscleEquipmentInferenceSchema,
    ),
};
