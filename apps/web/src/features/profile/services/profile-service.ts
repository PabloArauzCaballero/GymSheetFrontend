import { apiRequest } from '@/shared/api/api-client';
import type { OnboardingState, Profile, TrainingGoal, User, UserGender } from '@/shared/api/contracts';
import type { ProfileCompletion } from '@/shared/api/schemas';
import { onboardingSchema, profileCompletionSchema, profileSchema, userSchema } from '@/shared/api/schemas';

export type ProfileInput = {
  /** `YYYY-MM-DD`; `null` borra la fecha guardada. */
  fechaNacimiento?: string | null;
  pesoKg: number;
  estaturaCm: number;
  objetivo: TrainingGoal;
};

export const profileService = {
  getUser: () => apiRequest<User>('/users/me', userSchema),
  getProfile: () => apiRequest<Profile>('/profile', profileSchema),
  createProfile: (input: ProfileInput) =>
    apiRequest<Profile>('/profile', profileSchema, { method: 'POST', body: input }),
  updateProfile: (input: Partial<ProfileInput>) =>
    apiRequest<Profile>('/profile', profileSchema, { method: 'PATCH', body: input }),
  /**
   * Cambia el género de la cuenta.
   *
   * Va contra `/users/me` y no contra `/profile`: el perfil exige peso y
   * estatura, y obligar a medirse para poder corregir cómo te llama la
   * aplicación sería pedir un dato íntimo a cambio de otro.
   */
  updateGender: (genero: UserGender) =>
    apiRequest<User>('/users/me', userSchema, { method: 'PATCH', body: { genero } }),
  /** Cuánto suma cada chip rápido («+2,5 kg») al registrar una serie. */
  updateWeightIncrement: (pesoIncrementoKg: number) =>
    apiRequest<User>('/users/me', userSchema, {
      method: 'PATCH',
      body: { pesoIncrementoKg },
    }),
  /** Unas líneas sobre ti (160 como máximo); vacía o `null` la borra. */
  updateBio: (bio: string | null) =>
    apiRequest<User>('/users/me', userSchema, { method: 'PATCH', body: { bio } }),
  /**
   * Nivel e intereses desde el perfil. `PATCH`, no el `PUT` del cuestionario:
   * aquel devuelve el alta a «en curso» y el portal volvería a encerrar a la
   * persona en `/onboarding`.
   */
  updateTrainingProfile: (input: {
    experienceLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    trainingPreferences?: string[];
  }) =>
    apiRequest<OnboardingState>('/me/onboarding/preferences', onboardingSchema, { method: 'PATCH', body: input }),
  /**
   * Qué le falta al perfil y cuántos puntos vale cada dato. El servidor es la
   * autoridad: leerlo otorga lo recién completado, una vez por dato.
   */
  getCompletion: () =>
    apiRequest<ProfileCompletion>('/me/progression/profile-completion', profileCompletionSchema),
};
