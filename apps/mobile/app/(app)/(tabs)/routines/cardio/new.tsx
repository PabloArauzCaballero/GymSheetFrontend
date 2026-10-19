import { Redirect } from 'expo-router';
import { env } from '@/config/env';
import { CardioWizardScreen } from '@/features/cardio/cardio-wizard';

export default function CardioNewRoute() {
  return env.routinesV2 ? <CardioWizardScreen /> : <Redirect href="/routines" />;
}
