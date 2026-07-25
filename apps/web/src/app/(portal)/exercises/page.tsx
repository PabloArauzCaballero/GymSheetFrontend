import type { Metadata } from 'next';
import { ExerciseList } from '@/features/exercises/components/exercise-list';
export const metadata: Metadata = { title: 'Ejercicios' };
export default function ExercisesPage() {
  return <ExerciseList />;
}
