import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@gymsheet/api-client';
import { cardDisplayName, experienceLevelLabels } from '@gymsheet/domain';
import type { GymDirectoryEntry } from '@gymsheet/schemas';
import {
  accountService,
  onboardingService,
  profileCompletionService,
  profilePhotosService,
  profileService,
  progressionService,
} from '@/api/services';
import type { AboutChip } from '@/features/profile-hero/about-section';
import { GOAL_LABEL } from '@/lib/format';
import { useAuthStore } from '@/state/auth-store';

/** Clave de la completitud: bajo `progression` para que cualquier cambio de la senda la refresque. */
export const PROFILE_COMPLETION_KEY = ['progression', 'profile-completion'] as const;

/**
 * Todo lo que el perfil propio lee, en un sitio. Las claves son las mismas que
 * ya usaban las pantallas (`['profile','me']`, `['user','me']`…), así que una
 * edición en cualquier parte invalida lo que toca y nada se pide dos veces.
 */
export function useOwnProfile() {
  const principal = useAuthStore((state) => state.principal);
  const account = useQuery({ queryKey: ['user', 'me'], queryFn: () => accountService.getMe() });
  const profile = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileService.get(),
    // Sin medidas no hay perfil: es un estado vacío, no un fallo.
    retry: (failureCount, error) => !(error instanceof ApiError && error.kind === 'not-found') && failureCount < 1,
  });
  const onboarding = useQuery({ queryKey: ['onboarding', 'me'], queryFn: () => onboardingService.get() });
  const photos = useQuery({ queryKey: ['profile', 'photos'], queryFn: () => profilePhotosService.list(), staleTime: 60_000 });
  const progression = useQuery({ queryKey: ['progression', 'me'], queryFn: () => progressionService.get() });
  const completion = useQuery({ queryKey: PROFILE_COMPLETION_KEY, queryFn: () => profileCompletionService.get() });

  const missingProfile = profile.error instanceof ApiError && profile.error.kind === 'not-found';
  const bio = account.data?.bio?.trim() || null;
  const level = onboarding.data?.experienceLevel ?? null;
  const interests = onboarding.data?.trainingPreferences ?? [];

  const chips: AboutChip[] = [
    ...(profile.data ? [{ key: 'goal', label: GOAL_LABEL[profile.data.objetivo], icon: 'flag-outline' as const }] : []),
    ...(level ? [{ key: 'level', label: experienceLevelLabels[level], icon: 'speedometer-outline' as const }] : []),
    ...interests.map((interest) => ({ key: `interest-${interest}`, label: interest, icon: 'heart-outline' as const })),
  ];

  const fullName = account.data?.nombreCompleto ?? principal?.nombreCompleto ?? '';
  /**
   * Tu carta tal como la arma el servidor para los demás (`DirectoryEntry`):
   * mismo nombre corto, mismas fotos, mismos datos. La sede y el estado social
   * se dejan fuera porque dependen de quién mira.
   */
  const cardEntry: GymDirectoryEntry | null = principal
    ? {
        userId: principal.id,
        displayName: cardDisplayName(fullName) || 'Tú',
        objetivo: profile.data?.objetivo ?? null,
        branchId: null,
        branchName: null,
        connectionStatus: 'NONE',
        connectionId: null,
        socialStatus: null,
        photoUrl: photos.data?.[0]?.url ?? null,
        photos: (photos.data ?? []).map((photo) => ({ id: photo.id, url: photo.url })),
        age: profile.data?.edad ?? null,
        gender: account.data?.genero ?? null,
        experienceLevel: level,
        bio,
        points: progression.data?.points ?? null,
        levelCode: progression.data?.level?.code ?? null,
      }
    : null;

  return { principal, account, profile, onboarding, photos, progression, completion, missingProfile, bio, chips, cardEntry };
}
