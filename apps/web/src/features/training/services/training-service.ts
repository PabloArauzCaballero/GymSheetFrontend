import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  ImportRoutinesResponse,
  Page,
  Routine,
  RoutineAssignment,
  RoutineVisibility,
  TrainingGoal,
  Workout,
} from '@/shared/api/contracts';
import {
  importRoutinesResponseSchema,
  pageSchema,
  routineAssignmentSchema,
  routineSchema,
  workoutSchema,
} from '@/shared/api/schemas';

const routinePageSchema = pageSchema(routineSchema);
const assignmentListSchema = routineAssignmentSchema.array();
const deleteSchema = z.object({ deleted: z.literal(true) });

export type CreateRoutineInput = {
  nombre: string;
  descripcion?: string | null;
  visibilidad?: RoutineVisibility;
  objetivo?: TrainingGoal | null;
};

export type RoutineExerciseInput = {
  ejercicioId?: string;
  ejercicioNombre?: string;
  orden: number;
  seriesObjetivo?: number;
  repsMin?: number | null;
  repsMax?: number | null;
  pesoObjetivoKg?: number | null;
  rirObjetivo?: number | null;
  descansoSeg?: number | null;
  nota?: string | null;
};

export type AssignRoutineInput = {
  clienteUsuarioId: string;
  fechaProgramada?: string | null;
  diasSemana?: number[];
  nota?: string | null;
};

export type ImportRoutinePayload = {
  nombre: string;
  descripcion?: string | null;
  visibilidad?: RoutineVisibility;
  objetivo?: TrainingGoal | null;
  ejercicios: RoutineExerciseInput[];
};

export const trainingService = {
  list: (scope: 'mine' | 'templates' = 'mine') =>
    apiRequest<Page<Routine>>(`/routines?scope=${scope}&pageSize=100`, routinePageSchema),
  get: (id: string) => apiRequest<Routine>(`/routines/${id}`, routineSchema),
  create: (input: CreateRoutineInput) =>
    apiRequest<Routine>('/routines', routineSchema, { method: 'POST', body: input }),
  update: (id: string, input: Partial<CreateRoutineInput> & { estado?: 'ACTIVE' | 'ARCHIVED' }) =>
    apiRequest<Routine>(`/routines/${id}`, routineSchema, { method: 'PATCH', body: input }),
  remove: (id: string) =>
    apiRequest(`/routines/${id}`, deleteSchema, { method: 'DELETE' }),
  addExercise: (routineId: string, input: RoutineExerciseInput) =>
    apiRequest<Routine>(`/routines/${routineId}/exercises`, routineSchema, {
      method: 'POST',
      body: input,
    }),
  updateExercise: (routineExerciseId: string, input: Partial<Omit<RoutineExerciseInput, 'ejercicioId' | 'ejercicioNombre'>>) =>
    apiRequest<Routine>(`/routines/exercises/${routineExerciseId}`, routineSchema, {
      method: 'PATCH',
      body: input,
    }),
  removeExercise: (routineExerciseId: string) =>
    apiRequest<Routine>(`/routines/exercises/${routineExerciseId}`, routineSchema, {
      method: 'DELETE',
    }),
  assign: (routineId: string, input: AssignRoutineInput) =>
    apiRequest<RoutineAssignment>(`/routines/${routineId}/assign`, routineAssignmentSchema, {
      method: 'POST',
      body: input,
    }),
  start: (routineId: string) =>
    apiRequest<Workout>(`/routines/${routineId}/start`, workoutSchema, { method: 'POST' }),
  myAssignments: () =>
    apiRequest<RoutineAssignment[]>('/routines/assignments/me', assignmentListSchema),
  coachAssignments: () =>
    apiRequest<RoutineAssignment[]>('/routines/assignments/coach', assignmentListSchema),
  import: (rutinas: ImportRoutinePayload[]) =>
    apiRequest<ImportRoutinesResponse>('/routines/import', importRoutinesResponseSchema, {
      method: 'POST',
      body: { rutinas },
    }),
};
