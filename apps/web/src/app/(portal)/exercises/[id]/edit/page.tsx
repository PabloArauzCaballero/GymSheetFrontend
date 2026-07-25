import type { Metadata } from 'next';
import { ExerciseForm } from '@/features/exercises/components/exercise-form';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Editar ejercicio' };

export default async function EditExercisePage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [session, routeParams] = await Promise.all([requireSession(), params]);
  return <ExerciseForm exerciseId={routeParams.id} currentUserId={session.id} />;
}
