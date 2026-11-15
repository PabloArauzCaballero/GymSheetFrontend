'use client';

import { cardDisplayName, experienceLevelLabels } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { goalLabels } from '@/features/profile/components/profile-form-schema';
import { profilePhotosService } from '@/features/profile/services/profile-photos-service';
import { profileService } from '@/features/profile/services/profile-service';
import { progressionService } from '@/features/progression/services/progression-service';
import { ApiError } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import type { GymDirectoryEntry } from '@/shared/api/schemas';

/** Bajo `progression`: cualquier invalidación de la senda relee también esto. */
export const PROFILE_COMPLETION_KEY = ['progression', 'profile-completion'] as const;

export type AboutChip = { key: string; label: string; kind: 'goal' | 'level' | 'interest' };

/**
 * Todo lo que el perfil propio lee, con las mismas claves que ya usaban las
 * pantallas: una edición en cualquier sitio invalida lo que toca.
 */
export function useOwnProfile() {
  const user = useQuery({ queryKey: ['user', 'me'], queryFn: profileService.getUser });
  const profile = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      try {
        return await profileService.getProfile();
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    retry: false,
  });
  const onboarding = useQuery({ queryKey: queryKeys.onboarding, queryFn: onboardingService.get });
  const photos = useQuery({ queryKey: queryKeys.profilePhotos, queryFn: profilePhotosService.list, staleTime: 60_000 });
  const progression = useQuery({ queryKey: ['progression', 'me'], queryFn: progressionService.get, retry: false });
  const completion = useQuery({ queryKey: PROFILE_COMPLETION_KEY, queryFn: profileService.getCompletion, retry: false });

  const me = user.data;
  const bio = me?.bio?.trim() || null;
  const level = onboarding.data?.experienceLevel ?? null;
  const interests = onboarding.data?.trainingPreferences ?? [];
  const chips: AboutChip[] = [
    ...(profile.data ? [{ key: 'goal', label: goalLabels[profile.data.objetivo], kind: 'goal' as const }] : []),
    ...(level ? [{ key: 'level', label: experienceLevelLabels[level], kind: 'level' as const }] : []),
    ...interests.map((interest) => ({ key: `interest-${interest}`, label: interest, kind: 'interest' as const })),
  ];

  /** Tu carta tal como la arma el servidor para los demás; sede y estado dependen de quién mira. */
  const cardEntry: GymDirectoryEntry | null = me
    ? {
        userId: me.id,
        displayName: cardDisplayName(me.nombreCompleto) || 'Tú',
        objetivo: profile.data?.objetivo ?? null,
        branchId: null,
        branchName: null,
        connectionStatus: 'NONE',
        connectionId: null,
        socialStatus: null,
        photoUrl: photos.data?.[0]?.url ?? null,
        photos: (photos.data ?? []).map((photo) => ({ id: photo.id, url: photo.url })),
        age: profile.data?.edad ?? null,
        gender: me.genero ?? null,
        experienceLevel: level,
        bio,
        points: progression.data?.points ?? null,
        levelCode: progression.data?.level?.code ?? null,
      }
    : null;

  return { user, profile, onboarding, photos, progression, completion, bio, chips, cardEntry };
}
