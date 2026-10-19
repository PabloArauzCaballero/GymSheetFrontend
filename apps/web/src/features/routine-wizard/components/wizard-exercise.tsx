'use client';

import { createDraftExercise, findDay, type DayTarget } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ExerciseDetail } from '@/features/exercises/components/exercise-detail';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import type { UserRole } from '@/shared/api/contracts';
import { useRoutineDraft } from '../draft-store';
import { dayPath } from '../paths';

/**
 * Ficha de un ejercicio abierta desde el asistente (`?dia=<día>`): la misma
 * ficha de la biblioteca, con el botón fijo «Añadir a la rutina». Al añadir
 * vuelve a la lista del día con el contador actualizado.
 */
export function WizardExercise({
  id,
  dia,
  currentUserId,
  role,
}: Readonly<{ id: string; dia: DayTarget; currentUserId: string; role: UserRole }>) {
  const router = useRouter();
  const { state, draft, dispatch } = useRoutineDraft();
  const exercise = useQuery({ queryKey: ['exercise', id], queryFn: () => exerciseService.get(id) });
  const list = dia === 'grupo' ? state.grupo?.ejercicios : findDay(draft, dia)?.ejercicios;
  const added = list?.some((item) => item.ejercicioId === id) ?? false;

  return (
    <ExerciseDetail
      currentUserId={currentUserId}
      id={id}
      pick={{
        added,
        backHref: dayPath(dia),
        onToggle: () => {
          if (added) {
            dispatch({ type: 'quitarEjercicio', destino: dia, ejercicioId: id });
            return;
          }
          if (!exercise.data) return;
          dispatch({
            type: 'agregarEjercicio',
            destino: dia,
            ejercicio: createDraftExercise(exercise.data, draft.objetivo),
          });
          router.push(dayPath(dia));
        },
      }}
      role={role}
    />
  );
}
