import type { Metadata } from 'next';
import { ExerciseDetail } from '@/features/exercises/components/exercise-detail';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Detalle de ejercicio' };

export default async function ExercisePage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [session, routeParams] = await Promise.all([requireSession(), params]);
  return <ExerciseDetail id={routeParams.id} currentUserId={session.id} role={session.role} />;
}
