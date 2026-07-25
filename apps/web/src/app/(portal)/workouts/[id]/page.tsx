import type { Metadata } from 'next';
import { LiveWorkout } from '@/features/workouts/components/live-workout';
export const metadata: Metadata = { title: 'Entrenamiento' };
export default async function WorkoutPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  return <LiveWorkout id={(await params).id} />;
}
