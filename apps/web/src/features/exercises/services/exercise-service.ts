import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  Equipment,
  Exercise,
  ExerciseMedia,
  FavoriteExercise,
  Page,
} from '@/shared/api/contracts';
import {
  equipmentSchema,
  exerciseMediaSchema,
  exerciseSchema,
  favoriteExerciseSchema,
  pageSchema,
} from '@/shared/api/schemas';

export type ExerciseFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  grupoMuscular?: string;
  equipoId?: string;
  bodyPart?: string;
  targetMuscle?: string;
  dataSource?: 'CUSTOM' | 'EXERCISES_DATASET';
};

export type ExerciseInput = {
  nombre: string;
  grupoMuscular: string;
  descripcion?: string | null;
  equipoIds?: string[];
  bodyPart?: string | null;
  targetMuscle?: string | null;
  synergistMuscleGroup?: string | null;
  secondaryMuscles?: string[];
  instructions?: Record<string, string>;
  instructionSteps?: Record<string, string[]>;
  metadata?: Record<string, unknown>;
};

function queryString(filters: ExerciseFilters) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export const exerciseService = {
  list: (filters: ExerciseFilters) =>
    apiRequest<Page<Exercise>>(`/exercises?${queryString(filters)}`, pageSchema(exerciseSchema)),
  get: (id: string) => apiRequest<Exercise>(`/exercises/${id}`, exerciseSchema),
  createPersonal: (input: ExerciseInput) =>
    apiRequest<Exercise>('/exercises/personal', exerciseSchema, { method: 'POST', body: input }),
  updatePersonal: (id: string, input: Partial<ExerciseInput>) =>
    apiRequest<Exercise>(`/exercises/${id}`, exerciseSchema, { method: 'PATCH', body: input }),
  inactivatePersonal: (id: string) =>
    apiRequest<Exercise>(`/exercises/${id}`, exerciseSchema, { method: 'DELETE' }),

  addMedia: (
    exerciseId: string,
    input: {
      mediaType: 'IMAGE' | 'GIF' | 'VIDEO';
      provider: 'EXTERNAL_URL';
      url: string;
      thumbnailUrl?: string | null;
      mimeType?: string | null;
      altText: string;
      isPrimary?: boolean;
      sortOrder?: number;
      metadata?: Record<string, unknown>;
    },
  ) =>
    apiRequest<ExerciseMedia>(`/exercises/${exerciseId}/media`, exerciseMediaSchema, {
      method: 'POST',
      body: input,
    }),
  removeMedia: (mediaId: string) =>
    apiRequest(`/exercise-media/${mediaId}`, z.object({ deleted: z.literal(true) }), {
      method: 'DELETE',
    }),
  listEquipment: () => apiRequest<Equipment[]>('/equipment', z.array(equipmentSchema)),
  listFavorites: () =>
    apiRequest<FavoriteExercise[]>('/user-exercises', z.array(favoriteExerciseSchema)),
  addFavorite: (id: string) =>
    apiRequest(`/user-exercises/${id}`, z.record(z.string(), z.unknown()), { method: 'POST' }),
  removeFavorite: (id: string) =>
    apiRequest(`/user-exercises/${id}`, z.object({ deleted: z.literal(true) }), {
      method: 'DELETE',
    }),
};
