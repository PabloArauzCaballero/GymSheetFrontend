import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { Workout, WorkoutSetInput } from '@gymsheet/types';
import { accountService, workoutService } from '@/api/services';
import { notify } from '@/notifications';
import { formatDuration } from '@/lib/format';
import { useSessionRewardStore } from '@/state/session-reward-store';
import { useWorkoutStore } from '@/features/workout/workout-store';

/**
 * Datos y escrituras de una sesión: la sesión, la cuenta (incremento de peso),
 * el historial reciente (para «Última vez») y las mutaciones. Cada escritura
 * refresca la sesión y las listas que la resumen.
 */
export function useWorkoutSession(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setFinishedSession = useSessionRewardStore((state) => state.setLast);
  const endSession = useWorkoutStore((state) => state.endSession);

  const workout = useQuery({
    queryKey: ['workout', id],
    queryFn: () => workoutService.get(id),
    enabled: Boolean(id),
  });
  const account = useQuery({ queryKey: ['user', 'me'], queryFn: () => accountService.getMe() });
  /**
   * Sesiones recientes, solo para enseñar «Última vez». Misma clave que el
   * inicio: casi siempre ya está en caché. Un fallo aquí es silencioso: no
   * saber la carga de la semana pasada nunca impide registrar la de hoy.
   */
  const history = useQuery({ queryKey: ['workouts', 'recent'], queryFn: () => workoutService.list(40) });

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['workout', id] });
    void queryClient.invalidateQueries({ queryKey: ['workouts'] });
  };

  const addSet = useMutation({
    mutationFn: (input: { sessionExerciseId: string; set: WorkoutSetInput }) =>
      workoutService.addSet(input.sessionExerciseId, input.set),
    onSuccess: refreshAll,
    onError: (error: Error) => notify.error(error),
  });

  const addCardioSet = useMutation({
    mutationFn: (input: { sessionExerciseId: string; set: Parameters<typeof workoutService.addSet>[1] }) =>
      workoutService.addSet(input.sessionExerciseId, input.set),
    onSuccess: async () => {
      await refreshAll();
      notify.success('Cardio registrado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const removeSet = useMutation({
    mutationFn: (setId: string) => workoutService.removeSet(setId),
    onSuccess: async () => {
      await refreshAll();
      notify.success('Serie deshecha.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const addExercise = useMutation({
    mutationFn: (exerciseId: string) =>
      workoutService.addExercise(id, {
        ejercicioId: exerciseId,
        // Al final: el orden de una sesión en vivo es el orden en que se entrenó.
        orden: (workout.data?.ejercicios.length ?? 0) + 1,
      }),
    onSuccess: async () => {
      await refreshAll();
      notify.success('Ejercicio añadido.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const finish = useMutation({
    mutationFn: (location?: { latitude: number; longitude: number }) => workoutService.finish(id, location),
    onSuccess: async (session) => {
      endSession(id);
      await refreshAll();
      void queryClient.invalidateQueries({ queryKey: ['progression'] });
      void queryClient.invalidateQueries({ queryKey: ['programs'] });
      if (session.progression || session.programa || session.cardio) {
        // Con recompensa, el cierre es una pantalla que reemplaza a la sesión
        // (así «atrás» no vuelve a algo ya cerrado).
        setFinishedSession({
          sessionId: session.id,
          duration: formatDuration(session.fechaInicio, session.fechaFin),
          sets: countSets(session),
          volumeKg: volumeOf(session),
          geoVerified: session.geoVerificada,
          reward: session.progression,
          programa: session.programa,
          cardio: session.cardio,
        });
        router.replace('/workouts/resumen');
        return;
      }
      notify.success(
        session.geoVerificada ? 'Sesión finalizada. Racha verificada en tu sede.' : 'Sesión finalizada.',
      );
    },
    onError: (error: Error) => notify.error(error),
  });

  const cancel = useMutation({
    mutationFn: () => workoutService.cancel(id),
    onSuccess: async () => {
      endSession(id);
      await refreshAll();
      notify.success('Sesión cancelada.');
      router.back();
    },
    onError: (error: Error) => notify.error(error),
  });

  return { workout, account, history, addSet, addCardioSet, removeSet, addExercise, finish, cancel };
}

export function countSets(session: Pick<Workout, 'ejercicios'>): number {
  return session.ejercicios.reduce((sum, item) => sum + item.series.length, 0);
}

/** Tonelaje: el número que dice cuánto trabajo fue la sesión. */
export function volumeOf(session: Pick<Workout, 'ejercicios'>): number {
  return session.ejercicios.reduce(
    (sum, item) => sum + item.series.reduce((acc, set) => acc + (set.pesoKg ?? 0) * (set.repeticiones ?? 0), 0),
    0,
  );
}
