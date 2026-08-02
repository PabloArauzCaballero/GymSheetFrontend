import type { Metadata } from 'next';
import { RoutinesPageClient } from '@/features/training/components/routines-page-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Rutinas' };

export default async function RoutinesPage() {
  const session = await requireSession();
  return <RoutinesPageClient role={session.role} />;
}
