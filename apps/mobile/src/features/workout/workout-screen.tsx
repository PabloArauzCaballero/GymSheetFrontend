import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ErrorState, RowsSkeleton, Skeleton } from '@/components/feedback';
import { ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { WorkoutFocus } from '@/features/workout/focus/workout-focus';
import { useWorkoutSession } from '@/features/workout/use-workout-session';
import { WorkoutReview } from '@/features/workout/workout-review';
import { useWorkoutStore } from '@/features/workout/workout-store';

/**
 * La sesión de entrenamiento. En curso es el modo enfoque (un ejercicio por
 * página, `focus/workout-focus`); cerrada, el repaso de lo que se hizo
 * (`workout-review`).
 */
export function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useWorkoutSession(id);
  const { workout } = session;
  const data = workout.data;
  const endSession = useWorkoutStore((state) => state.endSession);

  // Una sesión que ya no está en curso no deja descanso ni mini-barra detrás.
  useEffect(() => {
    if (data && data.estado !== 'EN_PROGRESO') endSession(data.id);
  }, [data, endSession]);

  if (workout.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={56} />
        <Skeleton height={220} />
        <RowsSkeleton rows={3} thumb={48} />
      </ScrollScreen>
    );
  }
  if (workout.isError || !data) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={workout.error} onRetry={() => void workout.refetch()} />
      </ScrollScreen>
    );
  }
  if (data.estado === 'EN_PROGRESO') return <WorkoutFocus data={data} id={id} session={session} />;
  return <WorkoutReview data={data} onRefresh={() => void workout.refetch()} refreshing={workout.isRefetching} />;
}
