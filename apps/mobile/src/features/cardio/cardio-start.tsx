import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ApiError } from '@gymsheet/api-client';
import { exerciseService, programService, workoutService } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { useActivePrograms } from '@/features/programs/use-active-programs';
import { notify } from '@/notifications';

/** Ejercicio de cardio del catálogo que mejor representa cada modalidad (se busca por nombre). */
export const CARDIO_SEARCH: Record<string, string> = {
  BICI: 'stationary bike',
  CAMINAR: 'walking on incline treadmill',
  CORRER: 'stationary bike run',
  ELIPTICA: 'walk elliptical cross trainer',
  OTRO: 'jump rope',
  HIIT: 'jump rope',
  REMO: 'walk elliptical cross trainer',
  ESCALADORA: 'walking on incline treadmill',
  NADAR: 'jump rope',
};

/**
 * «Registrar cardio»: abre una sesión con el ejercicio de la modalidad de tu plan y lleva a la
 * pantalla de la sesión, donde el cronómetro y los campos de cardio reemplazan al formulario de
 * pesas. Si ya hay una sesión en curso se continúa en ella.
 */
export function CardioStartScreen() {
  const router = useRouter();
  const programs = useActivePrograms();
  const plans = useQuery({ queryKey: ['cardio-plans'], queryFn: () => programService.cardioPlans() });
  const started = useRef(false);

  const start = useMutation({
    mutationFn: async (modality: string) => {
      const open = (await workoutService.list(20)).items.find((item) => item.estado === 'EN_PROGRESO');
      const session = open ?? (await workoutService.start());
      const hasCardio = session.ejercicios.some((item) => item.ejercicio?.category === 'cardio');
      if (!hasCardio) {
        const found = await exerciseService.list({ search: CARDIO_SEARCH[modality] ?? 'jump rope', pageSize: 5 });
        const exercise = found.items.find((item) => item.category === 'cardio') ?? found.items[0];
        if (!exercise) throw new ApiError({ message: 'No encontramos un ejercicio de cardio.', status: 404, kind: 'not-found' });
        await workoutService.addExercise(session.id, { ejercicioId: exercise.id, orden: session.ejercicios.length + 1 });
      }
      return session.id;
    },
    onSuccess: (id) => router.replace({ pathname: '/workouts/[id]', params: { id } }),
    onError: (error: Error) => notify.error(error),
  });

  const plan = plans.data?.find((candidate) => candidate.id === programs.data?.cardio?.cardioPlanId);
  useEffect(() => {
    if (plan && !started.current) {
      started.current = true;
      start.mutate(plan.modalidad);
    }
  }, [plan, start]);

  return (
    <ScrollScreen>
      <BackLink />
      {programs.isError || plans.isError ? (
        <ErrorState error={programs.error ?? plans.error} onRetry={() => { void programs.refetch(); void plans.refetch(); }} />
      ) : (
        <Skeleton height={140} />
      )}
    </ScrollScreen>
  );
}
