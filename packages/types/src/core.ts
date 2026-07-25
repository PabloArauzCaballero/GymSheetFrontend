import type { EquipmentStatus, EquipmentType, TrainingGoal, UserRole } from './enums';

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type User = {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: UserRole;
  estado?: 'ACTIVO' | 'INACTIVO';
  fechaRegistro?: string;
};

export type SessionPrincipal = {
  id: string;
  email: string;
  role: UserRole;
  nombreCompleto?: string;
};

export type Profile = {
  id: string;
  usuarioId: string;
  edad: number | null;
  pesoKg: number;
  estaturaCm: number;
  objetivo: TrainingGoal;
  fechaActualizacion?: string;
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
