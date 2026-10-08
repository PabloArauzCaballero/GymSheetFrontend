import { Redirect, useLocalSearchParams } from 'expo-router';
import { env } from '@/config/env';
import { DaysStep } from '@/features/routine-wizard/step-days';
import { ReviewStep } from '@/features/routine-wizard/step-review';
import {
  DescriptionStep,
  DurationStep,
  GoalStep,
} from '@/features/routine-wizard/steps-basic';

/** Pasos 2 a 6 del asistente. El nombre del paso es el segmento de la URL. */
export default function WizardStepRoute() {
  const { paso } = useLocalSearchParams<{ paso: string }>();
  if (!env.routinesV2) return <Redirect href="/routines/new" />;
  switch (paso) {
    case 'descripcion':
      return <DescriptionStep />;
    case 'objetivo':
      return <GoalStep />;
    case 'duracion':
      return <DurationStep />;
    case 'dias':
      return <DaysStep />;
    case 'revision':
      return <ReviewStep />;
    default:
      return <Redirect href="/routines/new" />;
  }
}
