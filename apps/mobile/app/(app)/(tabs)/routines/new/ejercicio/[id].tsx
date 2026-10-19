import { useQuery } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { exerciseService } from '@/api/services';
import { createDraftExercise, findDay } from '@gymsheet/hooks';
import { env } from '@/config/env';
import { ExerciseDetailView } from '@/features/exercise-detail/exercise-detail-view';
import { useRoutineDraft } from '@/features/routine-wizard/use-wizard';
import { parseDayTarget } from '@/lib/wizard-routes';

/**
 * Ficha de un ejercicio abierta desde el asistente (`?pickFor=<día>`): la misma
 * ficha de la pestaña Ejercicios, con el botón fijo «Añadir a la rutina».
 */
export default function WizardExerciseRoute() {
  const { id, pickFor } = useLocalSearchParams<{
    id: string;
    pickFor: string;
  }>();
  const target = parseDayTarget(pickFor);
  const { state, draft, dispatch } = useRoutineDraft();
  const exercise = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exerciseService.get(id),
    enabled: Boolean(id),
  });

  if (!env.routinesV2 || !target) return <Redirect href="/routines/new" />;
  const list = target === 'grupo' ? state.grupo?.ejercicios : findDay(draft, target)?.ejercicios;
  const added = list?.some((item) => item.ejercicioId === id) ?? false;

  return (
    <ExerciseDetailView
      id={id}
      pick={{
        added,
        onToggle: () => {
          if (added) {
            dispatch({
              type: 'quitarEjercicio',
              destino: target,
              ejercicioId: id,
            });
            return;
          }
          if (!exercise.data) return;
          dispatch({
            type: 'agregarEjercicio',
            destino: target,
            ejercicio: createDraftExercise(exercise.data, draft.objetivo),
          });
          router.back();
        },
      }}
    />
  );
}
