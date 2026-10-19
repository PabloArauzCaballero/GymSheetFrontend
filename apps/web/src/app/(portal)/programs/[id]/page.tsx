import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ProgramView } from '@/features/programs/components/program-view';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Programa' };

export default async function ProgramPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireSession();
  if (!publicEnv.routinesV2) notFound();
  const { id } = await params;
  return (
    <Suspense>
      <ProgramView id={id} />
    </Suspense>
  );
}
