import { verificationView } from '@gymsheet/domain';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { NavRow } from '@/components/list';
import { useMyVerification } from './use-verification-flow';

/** «Verificación» row in the profile: the state in words; it opens the flow. */
export function VerificationStatusRow({ leading }: { leading?: ReactNode }) {
  const router = useRouter();
  const status = useMyVerification();
  const subtitle = status.data
    ? verificationView(status.data).title
    : status.isError
      ? 'No se pudo cargar tu verificación'
      : 'Cargando…';
  return (
    <NavRow
      leading={leading}
      onPress={() => router.push('/verificacion')}
      subtitle={subtitle}
      testID="profile-verification"
      title="Verificación"
    />
  );
}
