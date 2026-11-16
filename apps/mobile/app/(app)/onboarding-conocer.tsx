import { Redirect, useLocalSearchParams } from 'expo-router';
import { authDestination, offersConocer } from '@gymsheet/domain';
import { stepIndexOf } from '@/features/social-profile/conocer-steps';
import { ConocerFlowScreen } from '@/features/social-profile/conocer-flow-screen';
import { useAuthStore } from '@/state/auth-store';

/**
 * `/onboarding-conocer`: the optional "Conocer" step. The onboarding guard opens
 * it once right after the questionnaire; `?modo=perfil` opens it from Perfil
 * (and from the deck checklist, with `?paso=fotos` to land on a step).
 * Members only: staff opening the URL goes home instead of hitting a backend error.
 */
export default function OnboardingConocerScreen() {
  const params = useLocalSearchParams<{ modo?: string; paso?: string }>();
  const role = useAuthStore((state) => state.principal?.role);
  if (!offersConocer(role)) return <Redirect href={authDestination.mobile.afterLogin} />;
  return (
    <ConocerFlowScreen
      initialStep={stepIndexOf(params.paso)}
      mode={params.modo === 'perfil' ? 'perfil' : 'onboarding'}
    />
  );
}
