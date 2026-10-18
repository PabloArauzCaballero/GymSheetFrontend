import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ApiError } from '@gymsheet/api-client';
import { workoutExerciseSchema, workoutSetSchema } from '@gymsheet/schemas';
import type { RestSettingChange, SkipReason, SkippedSet, TimedWorkoutSetInput, Workout, WorkoutSetInput } from '@gymsheet/types';
import { accountService, workoutService } from '@/api/services';
import { hydrateSessionMarks, mergeMarks, useSessionMarks } from '@/features/workout/session-marks-store';
import { notify } from '@/notifications';
import { formatDuration } from '@/lib/format';
import { useSessionRewardStore } from '@/state/session-reward-store';
import { useWorkoutStore } from '@/features/workout/workout-store';
import { withExercise, withoutSet, withoutSkippedSet, withSavedSet, withSkippedSet } from '@/features/workout/workout-cache';

/**
 * ¿El fallo es de los que NO deben bloquear el entreno? La ruta aún no existe
 * en el servidor (404/405/501) o no hay red: lo marcado se queda en local.
 */
export function keepsLocal(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.kind === 'network' || error.status === 404 || error.status === 405 || error.status === 501 || error.status === 0;
}

/** ¿Fallo de red (y no una respuesta del servidor)? Vale la pena reintentar solo. */
export function isNetworkFailure(error: unknown): boolean {
  return !(error instanceof ApiError) || error.kind === 'network' || error.status === 0;
}

/**
 * Datos y escrituras de una sesión: la sesión, la cuenta (incremento de peso),
 * el historial reciente (para «Última vez») y las mutaciones.
 *
 * Durante la sesión cada escritura se aplica sobre la sesión en caché con lo
 * que devuelve el servidor (la serie, la saltada, el ejercicio): registrar una
 * serie ya no vuelve a pedir la sesión ni el historial. Las listas de sesiones
 * solo se marcan como viejas (se piden al volver a mirarlas) y se refrescan de
 * verdad al terminar o cancelar, que es cuando cambian para la barra de sesión
 * activa y el historial.
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

  /** Al cerrar (terminar o cancelar): la sesión y todas las listas, de verdad. */
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['workout', id] });
    void queryClient.invalidateQueries({ queryKey: ['workouts'] });
  };
  /** En plena sesión: las listas quedan viejas, sin pedirlas ahora (nadie las mira). */
  const markListsStale = () => {
    void queryClient.invalidateQueries({ queryKey: ['workouts'], refetchType: 'none' });
  };
  /** Pide la sesión otra vez: solo si la respuesta no se pudo aplicar en local. */
  const refetchSession = () => queryClient.invalidateQueries({ queryKey: ['workout', id], exact: true });
  /** Aplica un cambio sobre la sesión en caché y marca las listas. */
  const patchSession = (change: (session: Workout) => Workout) => {
    queryClient.setQueryData<Workout>(['workout', id], (old) => (old ? change(old) : old));
    markListsStale();
  };
  /** La serie que devuelve el servidor, o `null` si no tiene la forma esperada. */
  const savedSet = async (sessionExerciseId: string, response: unknown) => {
    const parsed = workoutSetSchema.safeParse(response);
    if (parsed.success) {
      patchSession((session) => withSavedSet(session, sessionExerciseId, parsed.data));
      return;
    }
    markListsStale();
    await refetchSession();
  };
  /** El ejercicio entero que devuelve el servidor (omitido o recuperado). */
  const savedExercise = async (response: unknown) => {
    const parsed = workoutExerciseSchema.safeParse(response);
    if (parsed.success && parsed.data.ejercicio) {
      const exercise = parsed.data;
      patchSession((session) => withExercise(session, exercise));
      return;
    }
    markListsStale();
    await refetchSession();
  };

  // Quien registra decide qué enseñar si falla (aviso en la página con «Reintentar»).
  const addSet = useMutation({
    mutationFn: (input: { sessionExerciseId: string; set: WorkoutSetInput | TimedWorkoutSetInput }) =>
      workoutService.addSet(input.sessionExerciseId, input.set),
    onSuccess: (response, input) => savedSet(input.sessionExerciseId, response),
  });

  /* ── D1 · saltar una serie, omitir un ejercicio ────────────────────────── */
  const marksStore = useSessionMarks;
  const marks = useSessionMarks((state) => state.sessions[id]);
  useEffect(() => {
    void hydrateSessionMarks();
  }, []);
  const data = useMemo(() => (workout.data ? mergeMarks(workout.data, marks) : undefined), [workout.data, marks]);

  const skipSet = useMutation({
    mutationFn: (input: { exerciseId: string; numeroSerie: number; motivo: SkipReason; nota: string | null }) =>
      workoutService.skipSet(input.exerciseId, { numeroSerie: input.numeroSerie, motivo: input.motivo, nota: input.nota }),
    onMutate: (input) => {
      const local: SkippedSet = {
        id: `local-${input.exerciseId}-${input.numeroSerie}`,
        numeroSerie: input.numeroSerie,
        motivo: input.motivo,
        nota: input.nota,
        fechaRegistro: new Date().toISOString(),
      };
      marksStore.getState().addSkip(id, input.exerciseId, local);
    },
    onSuccess: (saved, input) => {
      patchSession((session) => withSkippedSet(session, input.exerciseId, saved));
      marksStore.getState().removeSkip(id, input.exerciseId, input.numeroSerie);
    },
    onError: (error: Error, input) => {
      if (keepsLocal(error)) return;
      marksStore.getState().removeSkip(id, input.exerciseId, input.numeroSerie);
      notify.error(error);
    },
  });

  const undoSkip = useMutation({
    mutationFn: async (input: { exerciseId: string; skip: SkippedSet }) => {
      if (input.skip.id.startsWith('local-')) return null;
      return workoutService.unskipSet(input.skip.id);
    },
    onMutate: (input) => marksStore.getState().removeSkip(id, input.exerciseId, input.skip.numeroSerie),
    onSuccess: (_deleted, input) => patchSession((session) => withoutSkippedSet(session, input.exerciseId, input.skip.id)),
    onError: (error: Error) => notify.error(error),
  });

  const omitExercise = useMutation({
    mutationFn: (input: { exerciseId: string; motivo: SkipReason; nota: string | null }) =>
      workoutService.omitExercise(input.exerciseId, { motivo: input.motivo, nota: input.nota }),
    onMutate: (input) =>
      marksStore.getState().omit(id, input.exerciseId, { motivo: input.motivo, nota: input.nota, fecha: new Date().toISOString() }),
    onSuccess: async (saved, input) => {
      await savedExercise(saved);
      marksStore.getState().unomit(id, input.exerciseId);
    },
    onError: (error: Error, input) => {
      if (keepsLocal(error)) return;
      marksStore.getState().unomit(id, input.exerciseId);
      notify.error(error);
    },
  });

  const resumeExercise = useMutation({
    mutationFn: async (input: { exerciseId: string; onServer: boolean }) =>
      input.onServer ? workoutService.unomitExercise(input.exerciseId) : null,
    onMutate: (input) => marksStore.getState().unomit(id, input.exerciseId),
    onSuccess: (saved) => (saved ? savedExercise(saved) : undefined),
    onError: (error: Error) => {
      if (!keepsLocal(error)) notify.error(error);
    },
  });

  /* ── D2 · descanso e intervalo a mano ──────────────────────────────────── */
  const routineLink = useQuery({
    queryKey: ['workout', id, 'routine-link'],
    queryFn: () => workoutService.routineLink(id),
    enabled: Boolean(id),
    retry: false,
    staleTime: Infinity,
  });

  const applyRest = useMutation({
    mutationFn: async (input: { cambios: RestSettingChange[]; guardarEnRutina: boolean }) => {
      try {
        return await workoutService.restSettings(id, input);
      } catch (error) {
        // Rutina ajena u oficial: el descanso vale para hoy; no se guarda en la rutina.
        if (input.guardarEnRutina && error instanceof ApiError && error.code === 'ROUTINE_NOT_OWNED') {
          return workoutService.restSettings(id, { cambios: input.cambios, guardarEnRutina: false });
        }
        throw error;
      }
    },
    onMutate: (input) => {
      for (const change of input.cambios) {
        const { sesionEjercicioId, ...override } = change;
        marksStore.getState().setRest(id, sesionEjercicioId, override);
      }
    },
    onSuccess: (result, input) => {
      queryClient.setQueryData(['workout', id], result.sesion);
      marksStore.getState().clearRest(id, input.cambios.map((change) => change.sesionEjercicioId));
    },
    onError: (error: Error, input) => {
      if (keepsLocal(error)) return;
      marksStore.getState().clearRest(id, input.cambios.map((change) => change.sesionEjercicioId));
      notify.error(error);
    },
  });

  const addCardioSet = useMutation({
    mutationFn: (input: { sessionExerciseId: string; set: Parameters<typeof workoutService.addSet>[1] }) =>
      workoutService.addSet(input.sessionExerciseId, input.set),
    onSuccess: async (response, input) => {
      await savedSet(input.sessionExerciseId, response);
      notify.success('Cardio registrado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const removeSet = useMutation({
    mutationFn: (setId: string) => workoutService.removeSet(setId),
    onSuccess: (_deleted, setId) => {
      patchSession((session) => withoutSet(session, setId));
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
      // La respuesta no trae la ficha del ejercicio (nombre, foto): se pide la sesión.
      markListsStale();
      await refetchSession();
      notify.success('Ejercicio añadido.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const finish = useMutation({
    mutationFn: (location?: { latitude: number; longitude: number }) => workoutService.finish(id, location),
    onSuccess: async (session) => {
      endSession(id);
      marksStore.getState().clear(id);
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
      marksStore.getState().clear(id);
      await refreshAll();
      notify.success('Sesión cancelada.');
      router.back();
    },
    onError: (error: Error) => notify.error(error),
  });

  return {
    workout,
    /** La sesión con lo marcado en local encima (saltadas, omitidos, descansos). */
    data,
    account,
    history,
    addSet,
    addCardioSet,
    removeSet,
    addExercise,
    finish,
    cancel,
    skipSet,
    undoSkip,
    omitExercise,
    resumeExercise,
    routineLink,
    applyRest,
  };
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
