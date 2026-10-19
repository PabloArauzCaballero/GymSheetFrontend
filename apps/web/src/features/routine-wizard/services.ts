import { createExerciseCommunityServices, createRoutineServices } from '@gymsheet/api-client';
import { apiRequest } from '@/shared/api/api-client';

/** Rutinas por días (crear con `dias`, `PUT structure`, calendario y semanas), vía el BFF. */
export const routineBuilderService = createRoutineServices(apiRequest);

/** Me gusta (público) y favorito (privado) de un ejercicio, vía el BFF. */
export const exerciseCommunityService = createExerciseCommunityServices(apiRequest);
