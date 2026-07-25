import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type { Exercise } from '@/shared/api/contracts';
import { exerciseSchema } from '@/shared/api/schemas';
import type { ExerciseInput } from '@/features/exercises/services/exercise-service';

export const exerciseAdminService = {
  createGlobal: (input: ExerciseInput) =>
    apiRequest<Exercise>('/admin/exercises/global', exerciseSchema, {
      method: 'POST',
      body: input,
    }),
  updateGlobal: (id: string, input: Partial<ExerciseInput>) =>
    apiRequest<Exercise>(`/admin/exercises/global/${id}`, exerciseSchema, {
      method: 'PATCH',
      body: input,
    }),
  inactivateGlobal: (id: string) =>
    apiRequest<Exercise>(`/admin/exercises/global/${id}`, exerciseSchema, { method: 'DELETE' }),
  importDataset: (input: { dryRun: boolean; importMedia: boolean }) =>
    apiRequest('/admin/exercises/import/exercises-dataset', z.record(z.string(), z.unknown()), {
      method: 'POST',
      body: input,
      timeoutMs: 120_000,
    }),
};
