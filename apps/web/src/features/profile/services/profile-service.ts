import { apiRequest } from '@/shared/api/api-client';
import type { Profile, TrainingGoal, User } from '@/shared/api/contracts';
import { profileSchema, userSchema } from '@/shared/api/schemas';

export type ProfileInput = {
  edad: number;
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
};
