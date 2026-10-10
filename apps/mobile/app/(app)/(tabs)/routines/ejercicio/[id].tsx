import { useLocalSearchParams } from 'expo-router';
import { ExerciseDetailView } from '@/features/exercise-detail/exercise-detail-view';

/**
 * Ficha de un ejercicio abierta desde el detalle de una rutina. Vive dentro de la
 * pila de Rutinas para que «Volver» regrese al detalle (con su vista y su semana)
 * y no a la pestaña Ejercicios.
 */
export default function RoutineExerciseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseDetailView id={id} />;
}
