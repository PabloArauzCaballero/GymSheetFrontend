import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { parseDayTarget } from '@/features/routine-wizard/paths';
import { WizardExercise } from '@/features/routine-wizard/components/wizard-exercise';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Ficha del ejercicio' };

export default async function WizardExercisePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dia?: string }>;
}>) {
  const [session, routeParams, query] = await Promise.all([requireSession(), params, searchParams]);
  const dia = parseDayTarget(query.dia);
  if (!publicEnv.routinesV2 || !dia) notFound();
  return (
    <WizardExercise currentUserId={session.id} dia={dia} id={routeParams.id} role={session.role} />
  );
}
