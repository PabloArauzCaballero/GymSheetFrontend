import { z } from 'zod';
import { equipmentStatuses, equipmentTypes, trainingGoals, userRoles } from '@gymsheet/types';

export const problemSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  requestId: z.string().optional(),
  error: z.object({ message: z.string().optional() }).optional(),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  nombreCompleto: z.string(),
  rol: z.enum(userRoles),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  fechaRegistro: z.string().optional(),
});

export const sessionPrincipalSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(userRoles),
  nombreCompleto: z.string().optional(),
});

export const profileSchema = z.object({
  id: z.string().uuid(),
  usuarioId: z.string().uuid(),
  edad: z.number().int().nullable(),
  pesoKg: z.number(),
  estaturaCm: z.number().int(),
  objetivo: z.enum(trainingGoals),
  fechaActualizacion: z.string().optional(),
});

export const onboardingSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REQUIRES_UPDATE']),
  currentStep: z.number().int().min(1).max(5),
  completedSteps: z.array(z.number().int()),
  version: z.number().int(),
  primaryGoal: z
    .enum([
      'GAIN_MUSCLE',
      'LOSE_FAT',
      'IMPROVE_STRENGTH',
      'IMPROVE_ENDURANCE',
      'MAINTAIN_FITNESS',
      'GENERAL_HEALTH',
      'SPORT_PERFORMANCE',
    ])
    .nullable(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).nullable(),
  weeklyFrequency: z.number().int().nullable(),
  trainingLocation: z.enum(['GYM', 'HOME', 'OUTDOORS', 'MIXED']).nullable(),
  availableEquipment: z.array(z.string()),
  trainingPreferences: z.array(z.string()),
  physicalConsiderations: z.string().nullable(),
  weightUnit: z.enum(['KG', 'LB']),
  heightUnit: z.enum(['CM', 'IN']),
  height: z.number().nullable(),
  consentHealth: z.boolean(),
  consentData: z.boolean(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  missingFields: z.array(z.string()),
  profileComplete: z.boolean(),
});

export const bodyMeasurementSchema = z.object({
  id: z.string().uuid(),
  weight: z.number(),
  unit: z.enum(['KG', 'LB']),
  measuredOn: z.string(),
  source: z.enum(['ONBOARDING', 'PROFILE', 'USER', 'ADMIN']),
  createdAt: z.string(),
});

export const equipmentSchema = z
  .object({
    id: z.string().uuid(),
    nombre: z.string(),
    tipo: z.enum(equipmentTypes),
    descripcion: z.string().nullable(),
    estado: z.enum(equipmentStatuses),
  })
  .passthrough();

export const exerciseMediaSchema = z
  .object({
    id: z.string().uuid(),
    mediaType: z.enum(['IMAGE', 'GIF', 'VIDEO']),
    provider: z.enum(['EXTERNAL_URL', 'CLOUDINARY', 'S3', 'LOCAL']),
    externalId: z.string().nullable(),
    url: z.string().url(),
    thumbnailUrl: z.string().url().nullable(),
    mimeType: z.string().nullable(),
    width: z.number().int().nullable(),
    height: z.number().int().nullable(),
    altText: z.string(),
    attribution: z.string().nullable(),
    license: z.string().nullable(),
    isPrimary: z.boolean(),
    sortOrder: z.number().int(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .passthrough();

export const exerciseSchema = z
  .object({
    id: z.string().uuid(),
    nombre: z.string(),
    grupoMuscular: z.string(),
    descripcion: z.string().nullable(),
    tipoEjercicio: z.enum(['GLOBAL', 'PERSONAL']),
    createdByUsuarioId: z.string().uuid().nullable(),
    estado: z.enum(['ACTIVO', 'INACTIVO']),
    dataSource: z.enum(['CUSTOM', 'EXERCISES_DATASET']),
    category: z.string().nullable(),
    bodyPart: z.string().nullable(),
    requiredEquipment: z.string().nullable(),
    targetMuscle: z.string().nullable(),
    synergistMuscleGroup: z.string().nullable(),
    secondaryMuscles: z.array(z.string()),
    instructions: z.record(z.string(), z.string()),
    instructionSteps: z.record(z.string(), z.array(z.string())),
    metadata: z.record(z.string(), z.unknown()),
    equipment: z.array(equipmentSchema),
    media: z.array(exerciseMediaSchema),
  })
  .passthrough();

export const favoriteExerciseSchema = z.object({
  id: z.string().uuid(),
  fechaSeleccion: z.string(),
  ejercicio: exerciseSchema,
});

export function pageSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  });
}
