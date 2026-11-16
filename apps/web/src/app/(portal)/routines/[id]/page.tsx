import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RoutineDetailV2 } from '@/features/routine-detail/components/routine-detail-v2';
import { RoutineDetailClient } from '@/features/training/components/routine-detail-client';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Rutina' };

export default async function RoutineDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireSession();
  const { id } = await params;
  return publicEnv.routinesV2 ? (
    <Suspense>
      <RoutineDetailV2 id={id} />
    </Suspense>
  ) : (
    <RoutineDetailClient id={id} />
  );
}
