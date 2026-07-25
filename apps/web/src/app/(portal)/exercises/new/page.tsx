import type { Metadata } from 'next';
import { ExerciseForm } from '@/features/exercises/components/exercise-form';
export const metadata: Metadata = { title: 'Nuevo ejercicio' };
export default function NewExercisePage() {
  return <ExerciseForm />;
}
