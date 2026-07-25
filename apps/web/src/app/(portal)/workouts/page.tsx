import type { Metadata } from 'next';
import { WorkoutList } from '@/features/workouts/components/workout-list';
export const metadata: Metadata = { title: 'Entrenamientos' };
export default function WorkoutsPage() {
  return <WorkoutList />;
}
