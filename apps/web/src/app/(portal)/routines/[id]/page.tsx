import type { Metadata } from 'next';
import { RoutineDetailClient } from '@/features/training/components/routine-detail-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Rutina' };

export default async function RoutineDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const session = await requireSession();
  return <RoutineDetailClient id={(await params).id} role={session.role} />;
}
