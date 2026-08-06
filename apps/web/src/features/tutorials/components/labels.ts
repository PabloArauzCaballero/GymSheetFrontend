import type { TutorialCategory, TutorialDifficulty } from '../model/types';
import type { TutorialStatus } from '../engine/progress-helpers';

export const categoryLabels: Record<TutorialCategory, string> = {
  INTRODUCTION: 'Introducción',
  NAVIGATION: 'Navegación',
  PROFILE: 'Perfil',
  TRAINING: 'Entrenamiento',
  EXERCISES: 'Ejercicios',
  MEMBERSHIP: 'Membresía',
  ADMIN: 'Administración',
};

export const difficultyLabels: Record<TutorialDifficulty, string> = {
  BEGINNER: 'Básico',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

export const statusLabels: Record<TutorialStatus, string> = {
  NOT_STARTED: 'Sin empezar',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  SKIPPED: 'Omitido',
};

export const statusTone: Record<TutorialStatus, 'neutral' | 'info' | 'success' | 'warning'> = {
  NOT_STARTED: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  SKIPPED: 'warning',
};
