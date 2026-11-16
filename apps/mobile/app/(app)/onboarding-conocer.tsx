import { useLocalSearchParams } from 'expo-router';
import { stepIndexOf } from '@/features/social-profile/conocer-steps';
import { ConocerFlowScreen } from '@/features/social-profile/conocer-flow-screen';

/**
 * `/onboarding-conocer`: the optional "Conocer" step. The onboarding guard opens
 * it once right after the questionnaire; `?modo=perfil` opens it from Perfil
 * (and from the deck checklist, with `?paso=fotos` to land on a step).
 */
export default function OnboardingConocerScreen() {
  const params = useLocalSearchParams<{ modo?: string; paso?: string }>();
  return (
    <ConocerFlowScreen
      initialStep={stepIndexOf(params.paso)}
      mode={params.modo === 'perfil' ? 'perfil' : 'onboarding'}
    />
  );
}
