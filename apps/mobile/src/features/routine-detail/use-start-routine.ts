import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ApiError } from '@gymsheet/api-client';
import { workoutService } from '@/api/services';
import { notify } from '@/notifications';

/**
 * Inicia una sesión desde una rutina (opcionalmente desde un día concreto). El
 * backend permite una sola sesión abierta: si ya hay una, se lleva a la persona
 * allí en vez de enseñarle un callejón sin salida.
 */
export function useStartRoutine(routineId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routineDayId?: string) => workoutService.startFromRoutine(routineId, routineDayId),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      notify.success('Sesión iniciada.');
      router.replace({ pathname: '/workouts/[id]', params: { id: session.id } });
    },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.kind === 'conflict') {
        const history = await workoutService.list(20).catch(() => null);
        const open = history?.items.find((item) => item.estado === 'EN_PROGRESO');
        if (open) {
          notify.info('Ya tienes una sesión en curso.');
          router.replace({ pathname: '/workouts/[id]', params: { id: open.id } });
          return;
        }
      }
      notify.error(error);
    },
  });
}
