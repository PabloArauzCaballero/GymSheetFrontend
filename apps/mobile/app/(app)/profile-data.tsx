import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ApiError } from '@gymsheet/api-client';
import { formatDecimalInput } from '@gymsheet/domain';
import { profileService } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { splitBirthDate } from '@/features/profile-edit/body-data-schema';
import { BodyDataWizard } from '@/features/profile-edit/body-data-wizard';

/**
 * Peso, estatura, nacimiento y objetivo (antes vivía en `/profile-edit`, que
 * ahora es la edición completa del perfil). `?step=2` abre directamente en la
 * fecha de nacimiento, que es a donde lleva el empujón de puntos.
 */
export default function ProfileDataScreen() {
  const { step } = useLocalSearchParams<{ step?: string }>();
  const profile = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileService.get(),
    // A 404 means "no body data yet", which this screen exists to fix.
    retry: (failureCount, error) => !(error instanceof ApiError && error.kind === 'not-found') && failureCount < 1,
  });
  const isNew = profile.error instanceof ApiError && profile.error.kind === 'not-found';

  if (profile.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={90} />
        <Skeleton height={220} />
      </ScrollScreen>
    );
  }
  if (profile.isError && !isNew) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      </ScrollScreen>
    );
  }

  const current = profile.data;
  return (
    <ScrollScreen center>
      <BackLink />
      <ScreenHeader
        subtitle={isNew ? 'Añade tus datos y personaliza tus entrenos.' : 'Mantén tus datos al día y sigue tu progreso.'}
        title={isNew ? 'Tus datos' : 'Editar tus datos'}
      />
      <BodyDataWizard
        defaults={{
          pesoKg: current ? formatDecimalInput(current.pesoKg) : '',
          estaturaCm: current ? String(current.estaturaCm) : '',
          fechaNacimiento: splitBirthDate(current?.fechaNacimiento),
          objetivo: current?.objetivo ?? 'HIPERTROFIA',
        }}
        hadBirthDate={Boolean(current?.fechaNacimiento)}
        initialStep={Number(step ?? 0) || 0}
        isNew={isNew}
      />
    </ScrollScreen>
  );
}
