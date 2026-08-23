import { apiRequest } from '@/shared/api/api-client';
import {
  leaderboardSchema,
  muscleEquipmentInferenceSchema,
  progressionAcknowledgedSchema,
  progressionSchema,
} from '@/shared/api/schemas';
import type {
  LeaderboardEntry,
  MuscleEquipmentInference,
  Progression,
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
  acknowledge: () =>
    apiRequest('/me/progression/acknowledge', progressionAcknowledgedSchema, { method: 'POST' }),
  leaderboard: (limit = 10) =>
    apiRequest<LeaderboardEntry[]>(
      `/me/progression/leaderboard?limit=${limit}`,
      leaderboardSchema,
    ),
};

/** Ejercicios propios: se elige el músculo y el servidor deduce la máquina. */
export const personalExerciseService = {
  suggestEquipment: (muscleCode: string) =>
    apiRequest<MuscleEquipmentInference>(
      `/exercises/equipment-suggestion?muscle=${encodeURIComponent(muscleCode)}`,
      muscleEquipmentInferenceSchema,
    ),
};
