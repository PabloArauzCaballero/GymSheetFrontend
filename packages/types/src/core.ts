import type { EquipmentStatus, EquipmentType, TrainingGoal, UserRole } from './enums';

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/**
 * Género declarado por la persona.
 *
 * `UNSPECIFIED` no es lo mismo que ausencia: significa «me lo preguntaron y
 * elijo no decirlo». Nulo es «todavía no se ha preguntado». Los dos llevan a la
 * rama neutra de la senda, pero solo el segundo justifica volver a preguntar.
 */
export type UserGender = 'MALE' | 'FEMALE' | 'UNSPECIFIED';

export type User = {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: UserRole;
  estado?: 'ACTIVO' | 'INACTIVO';
  fechaRegistro?: string;
  /** Gimnasio de la cuenta; el cliente pinta su marca a partir de esto. */
  tenantId?: string | null;
  /** Nulo = no se ha preguntado. */
  genero?: UserGender | null;
  /** Cuánto suma cada chip rápido al registrar una serie. 2.5 por defecto. */
  pesoIncrementoKg?: number;
};

export type SessionPrincipal = {
  id: string;
  email: string;
  role: UserRole;
  nombreCompleto?: string;
  /** Permisos granulares de administración otorgados a esta cuenta (solo staff). */
  permissions?: string[];
};

export type Profile = {
  id: string;
  usuarioId: string;
  edad: number | null;
  /** `YYYY-MM-DD`. */
  fechaNacimiento?: string | null;
  pesoKg: number;
  estaturaCm: number;
  objetivo: TrainingGoal;
  fechaActualizacion?: string;
};

/** Una foto de la galería de perfil. Hasta seis por cuenta. */
export type ProfilePhoto = {
  id: string;
  url: string;
  posicion: number;
  fechaCreacion: string;
};

export const fitnessGoals = [
  'GAIN_MUSCLE',
  'LOSE_FAT',
  'IMPROVE_STRENGTH',
  'IMPROVE_ENDURANCE',
  'MAINTAIN_FITNESS',
  'GENERAL_HEALTH',
  'SPORT_PERFORMANCE',
] as const;
export type FitnessGoal = (typeof fitnessGoals)[number];
export type OnboardingState = {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REQUIRES_UPDATE';
  currentStep: number;
  completedSteps: number[];
  version: number;
  primaryGoal: FitnessGoal | null;
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null;
  weeklyFrequency: number | null;
  trainingLocation: 'GYM' | 'HOME' | 'OUTDOORS' | 'MIXED' | null;
  availableEquipment: string[];
  trainingPreferences: string[];
  physicalConsiderations: string | null;
  weightUnit: 'KG' | 'LB';
  heightUnit: 'CM' | 'IN';
  height: number | null;
  consentHealth: boolean;
  consentData: boolean;
  startedAt: string | null;
  completedAt: string | null;
  missingFields: string[];
  profileComplete: boolean;
};

export type BodyMeasurement = {
  id: string;
  weight: number;
  unit: 'KG' | 'LB';
  measuredOn: string;
  source: 'ONBOARDING' | 'PROFILE' | 'USER' | 'ADMIN';
  createdAt: string;
};

export type Equipment = {
  id: string;
  nombre: string;
  tipo: EquipmentType;
  descripcion: string | null;
  estado: EquipmentStatus;
  etiquetaActivo?: string | null;
  numeroSerie?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  adquiridoEl?: string | null;
};

export type ExerciseMedia = {
  id: string;
  mediaType: 'IMAGE' | 'GIF' | 'VIDEO';
  provider: 'EXTERNAL_URL' | 'CLOUDINARY' | 'S3' | 'LOCAL';
  externalId: string | null;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  altText: string;
  attribution: string | null;
  license: string | null;
  isPrimary: boolean;
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
};

export type Exercise = {
  id: string;
  nombre: string;
  grupoMuscular: string;
  descripcion: string | null;
  tipoEjercicio: 'GLOBAL' | 'PERSONAL';
  createdByUsuarioId: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  dataSource: 'CUSTOM' | 'EXERCISES_DATASET';
  category: string | null;
  bodyPart: string | null;
  requiredEquipment: string | null;
  targetMuscle: string | null;
  synergistMuscleGroup: string | null;
  secondaryMuscles: string[];
  instructions: Record<string, string>;
  instructionSteps: Record<string, string[]>;
  metadata: Record<string, unknown>;
  equipment: Equipment[];
  media: ExerciseMedia[];
};

export type FavoriteExercise = {
  id: string;
  fechaSeleccion: string;
  ejercicio: Exercise;
};
