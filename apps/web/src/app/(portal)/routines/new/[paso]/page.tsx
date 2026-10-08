import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  DescriptionStep,
  GoalStep,
  NameStep,
} from '@/features/routine-wizard/components/steps-basic';
import { DurationStep } from '@/features/routine-wizard/components/step-duration';
import { DaysStep } from '@/features/routine-wizard/components/step-days';
import { ReviewStep } from '@/features/routine-wizard/components/step-review';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Nueva rutina' };

/** Pasos del asistente de creación de rutinas; el segmento de la URL es el paso. */
export default async function WizardStepPage({
  params,
}: Readonly<{ params: Promise<{ paso: string }> }>) {
  await requireSession();
  if (!publicEnv.routinesV2) notFound();
  switch ((await params).paso) {
    case 'nombre':
      return <NameStep />;
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
      notFound();
  }
}
