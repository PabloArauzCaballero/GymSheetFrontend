import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CardioLogger } from '@/features/cardio/components/cardio-logger';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Registrar cardio' };

export default async function LogCardioPage() {
  await requireSession();
  if (!publicEnv.routinesV2) notFound();
  return <CardioLogger />;
}
