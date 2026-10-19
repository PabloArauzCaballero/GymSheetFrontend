import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ActivationFlow } from '@/features/programs/components/activation/activation-flow';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Activar rutina' };

export default async function ActivateRoutinePage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireSession();
  if (!publicEnv.routinesV2) notFound();
  const { id } = await params;
  return (
    <Suspense>
      <ActivationFlow routineId={id} />
    </Suspense>
  );
}
