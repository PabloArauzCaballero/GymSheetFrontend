import type { DirectoryConnectionStatus, SocialStatusValue, TrainingLocation } from '@gymsheet/schemas';

export const TRAINING_GOAL_LABEL: Record<string, string> = {
  HIPERTROFIA: 'Hipertrofia',
  FUERZA: 'Fuerza',
  RESISTENCIA: 'Resistencia',
  PERDIDA_GRASA: 'Pérdida de grasa',
  SALUD_GENERAL: 'Salud general',
  REHABILITACION: 'Rehabilitación',
};

export const TRAINING_LOCATION_LABEL: Record<TrainingLocation, string> = {
  GYM: 'Gimnasio',
  HOME: 'Casa',
  OUTDOORS: 'Aire libre',
  MIXED: 'Mixto',
};

export const DIRECTORY_STATUS_LABEL: Record<DirectoryConnectionStatus, string> = {
  NONE: 'Sin conexión',
  PENDING_SENT: 'Solicitud enviada',
  PENDING_RECEIVED: 'Te escribió',
  ACCEPTED: 'Conectado/a',
};

export const SOCIAL_STATUS_LABEL: Record<SocialStatusValue, string> = {
  OPEN_TO_MEET: 'Abierto/a a conocer gente',
  IN_RELATIONSHIP: 'En pareja',
  SINGLE: 'Soltero/a',
};

export const GENDER_LABEL: Record<string, string> = {
  MALE: 'Hombre',
  FEMALE: 'Mujer',
  UNSPECIFIED: 'Sin especificar',
};

export const EXPERIENCE_LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};
