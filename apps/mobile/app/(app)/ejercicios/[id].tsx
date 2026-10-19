import { useLocalSearchParams } from 'expo-router';
import { ExerciseDetailView } from '@/features/exercise-detail/exercise-detail-view';

/** Ficha de un ejercicio. El cuerpo vive en `ExerciseDetailView`, que el asistente de rutinas también usa. */
export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseDetailView id={id} />;
}
