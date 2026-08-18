import { z } from 'zod';
import {
  exerciseSchema,
  membershipProjectionSchema,
  pageSchema,
  profileSchema,
  routineAssignmentSchema,
  routineSchema,
  workoutSchema,
} from '@gymsheet/schemas';
import type {
  AddWorkoutExerciseInput,
  TrainingGoal,
  WorkoutSetInput,
} from '@gymsheet/types';
import { apiClient } from '@/api/client';

/** Endpoints that answer with a free-form object we do not need to model. */
const looseObject = z.record(z.string(), z.unknown());
const deletedSchema = z.object({ deleted: z.literal(true) });

/**
 * Read endpoints the client-facing app needs. Contracts come from
 * `@gymsheet/schemas`, the same source the web app validates against, so a
 * backend change surfaces as a `contract` error on both clients at once.
 *
 * Everything here is a GET: the mobile app currently reports state, it does not
 * mutate it. Writes belong next to the screen that owns them.
 */
export const profileService = {
  /** Anthropometric profile. 404 means the user has not onboarded yet. */
  get: () => apiClient.request('/profile', profileSchema, { method: 'GET' }),
  create: (input: ProfileInput) =>
    apiClient.request('/profile', profileSchema, { method: 'POST', body: input }),
  update: (input: Partial<ProfileInput>) =>
    apiClient.request('/profile', profileSchema, { method: 'PATCH', body: input }),
};

export interface ProfileInput {
  edad?: number | null;
  pesoKg: number;
  estaturaCm: number;
  objetivo: TrainingGoal;
}

export const membershipService = {
  getMine: () => apiClient.request('/me/membership', membershipProjectionSchema, { method: 'GET' }),
};

export const workoutService = {
  /** Most recent sessions first, as the backend orders them. */
  list: (pageSize = 5) =>
    apiClient.request(`/workouts?page=1&pageSize=${pageSize}`, pageSchema(workoutSchema), {
      method: 'GET',
    }),
  get: (id: string) => apiClient.request(`/workouts/${id}`, workoutSchema, { method: 'GET' }),

  /** Starts an empty session; exercises are added as the user trains. */
  start: (observacion?: string) =>
    apiClient.request('/workouts', workoutSchema, {
      method: 'POST',
      body: { observacion: observacion ?? null },
    }),
  /** Starts a session pre-filled from a routine. */
  startFromRoutine: (routineId: string) =>
    apiClient.request(`/routines/${routineId}/start`, workoutSchema, { method: 'POST' }),
  finish: (id: string) =>
    apiClient.request(`/workouts/${id}/finish`, workoutSchema, { method: 'PATCH' }),
  cancel: (id: string) =>
    apiClient.request(`/workouts/${id}/cancel`, workoutSchema, { method: 'PATCH' }),

  addExercise: (sessionId: string, input: AddWorkoutExerciseInput) =>
    apiClient.request(`/workouts/${sessionId}/exercises`, looseObject, {
      method: 'POST',
      body: input,
    }),
  removeExercise: (sessionExerciseId: string) =>
    apiClient.request(`/workouts/session-exercises/${sessionExerciseId}`, deletedSchema, {
      method: 'DELETE',
    }),

  addSet: (sessionExerciseId: string, input: WorkoutSetInput) =>
    apiClient.request(`/workouts/session-exercises/${sessionExerciseId}/sets`, looseObject, {
      method: 'POST',
      body: input,
    }),
  updateSet: (setId: string, input: Partial<WorkoutSetInput>) =>
    apiClient.request(`/workouts/sets/${setId}`, looseObject, { method: 'PATCH', body: input }),
  removeSet: (setId: string) =>
    apiClient.request(`/workouts/sets/${setId}`, deletedSchema, { method: 'DELETE' }),
};

export const routineService = {
  myAssignments: () =>
    apiClient.request('/routines/assignments/me', z.array(routineAssignmentSchema), {
      method: 'GET',
    }),
  /** `scope=mine` returns the routines the signed-in user can train with. */
  list: () =>
    apiClient.request('/routines?scope=mine&pageSize=100', pageSchema(routineSchema), {
      method: 'GET',
    }),
  get: (id: string) => apiClient.request(`/routines/${id}`, routineSchema, { method: 'GET' }),
};

export interface ExerciseFilters {
  search?: string;
  grupoMuscular?: string;
  /** Server-side drill-down: the catalogue is far too large to filter locally. */
  bodyPart?: string;
  targetMuscle?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Body parts and, inside each, the muscles they train, with how many exercises
 * each holds. Powers the catalogue's grid navigation, so the app never has to
 * carry a hardcoded list of muscles that would drift from the data.
 */
export const exerciseTaxonomySchema = z.array(
  z.object({
    bodyPart: z.string(),
    total: z.number().int(),
    /**
     * A representative plate from the catalogue. The dataset illustrations
     * highlight the worked muscle in red, so they identify a group far faster
     * than any icon could — the picture *is* the label.
     */
    imageUrl: z.string().nullable().default(null),
    muscles: z.array(
      z.object({
        targetMuscle: z.string(),
        total: z.number().int(),
        imageUrl: z.string().nullable().default(null),
      }),
    ),
  }),
);

export type ExerciseTaxonomy = z.infer<typeof exerciseTaxonomySchema>;

function queryString(filters: ExerciseFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export const exerciseService = {
  list: (filters: ExerciseFilters = {}) =>
    apiClient.request(
      `/exercises?${queryString({ page: 1, pageSize: 30, ...filters })}`,
      pageSchema(exerciseSchema),
      { method: 'GET' },
    ),
  get: (id: string) => apiClient.request(`/exercises/${id}`, exerciseSchema, { method: 'GET' }),
  taxonomy: () =>
    apiClient.request('/exercises/taxonomy', exerciseTaxonomySchema, { method: 'GET' }),
};
