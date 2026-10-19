import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CardioWizard } from '@/features/cardio/components/cardio-wizard';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Plan de cardio' };

export default async function NewCardioPage() {
  await requireSession();
  if (!publicEnv.routinesV2) notFound();
  return <CardioWizard />;
}
