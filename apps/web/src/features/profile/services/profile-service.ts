import { apiRequest } from '@/shared/api/api-client';
import type { Profile, TrainingGoal, User, UserGender } from '@/shared/api/contracts';
import { profileSchema, userSchema } from '@/shared/api/schemas';

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
};
