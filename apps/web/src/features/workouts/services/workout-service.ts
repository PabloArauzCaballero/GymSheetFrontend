import { z } from 'zod';
import { apiRequest, downloadFromApi } from '@/shared/api/api-client';
import type {
  AddWorkoutExerciseInput,
  CreateWorkoutInput,
  Page,
  Workout,
  WorkoutSetInput,
} from '@/shared/api/contracts';
import { pageSchema, workoutSchema } from '@/shared/api/schemas';

const deleteSchema = z.object({ deleted: z.literal(true) });
const objectSchema = z.record(z.string(), z.unknown());

export const workoutService = {
  list: (page = 1, pageSize = 20) =>
    apiRequest<Page<Workout>>(
      `/workouts?page=${page}&pageSize=${pageSize}`,
      pageSchema(workoutSchema),
    ),
  get: (id: string) => apiRequest<Workout>(`/workouts/${id}`, workoutSchema),
  start: (input: CreateWorkoutInput) =>
    apiRequest<Workout>('/workouts', workoutSchema, { method: 'POST', body: input }),
  finish: (id: string) =>
    apiRequest<Workout>(`/workouts/${id}/finish`, workoutSchema, { method: 'PATCH' }),
  cancel: (id: string) =>
    apiRequest<Workout>(`/workouts/${id}/cancel`, workoutSchema, { method: 'PATCH' }),
  addExercise: (sessionId: string, input: AddWorkoutExerciseInput) =>
    apiRequest(`/workouts/${sessionId}/exercises`, objectSchema, { method: 'POST', body: input }),
  updateExercise: (id: string, input: Partial<Omit<AddWorkoutExerciseInput, 'ejercicioId'>>) =>
    apiRequest(`/workouts/session-exercises/${id}`, objectSchema, { method: 'PATCH', body: input }),
  removeExercise: (id: string) =>
    apiRequest(`/workouts/session-exercises/${id}`, deleteSchema, { method: 'DELETE' }),
  addSet: (sessionExerciseId: string, input: WorkoutSetInput) =>
    apiRequest(`/workouts/session-exercises/${sessionExerciseId}/sets`, objectSchema, {
      method: 'POST',
      body: input,
    }),
  updateSet: (id: string, input: Partial<WorkoutSetInput>) =>
    apiRequest(`/workouts/sets/${id}`, objectSchema, { method: 'PATCH', body: input }),
  removeSet: (id: string) => apiRequest(`/workouts/sets/${id}`, deleteSchema, { method: 'DELETE' }),
  exportCsv: () => downloadFromApi('/export/workout-history/csv', 'gymsheet-historial.csv'),
  exportJson: () => downloadFromApi('/export/workout-history', 'gymsheet-historial.json'),
};
