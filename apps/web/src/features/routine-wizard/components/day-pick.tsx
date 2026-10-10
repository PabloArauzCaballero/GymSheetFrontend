'use client';

import {
  WEEKDAY_NAMES,
  countLabel,
  createDraftExercise,
  findDay,
  type DayTarget,
  type Weekday,
} from '@gymsheet/hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ExerciseBrowser } from '@/features/exercises/components/exercise-browser';
import type { PickConfig } from '@/features/exercises/components/pick-types';
import { Button } from '@/shared/components/ui/button';
import { getRoutineDraft, useRoutineDraft } from '../draft-store';
import { orderPath, pickDetailPath, wizardStepPath } from '../paths';
import { WizardFrame } from './wizard-frame';

const DAYS_STEP = 4;

/** «Lunes y jueves», «Lunes, miércoles y viernes». */
function listDays(days: readonly Weekday[]): string {
  const names = days.map((dia, index) =>
    index === 0 ? WEEKDAY_NAMES[dia] : WEEKDAY_NAMES[dia].toLowerCase(),
  );
  return names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * Ejercicios de un día, en una página completa (nunca un diálogo): el buscador
 * de la biblioteca en modo selector, con «+» por fila, la ficha al abrir la fila
 * y la barra inferior «N ejercicios · Ver y ordenar · Listo».
 *
 * `dia` es un día de la semana o `grupo` («Configurar seleccionados»: lo elegido
 * se copia a todos los días marcados al pulsar Listo).
 */
export function DayPick({ dia }: Readonly<{ dia: DayTarget }>) {
  const router = useRouter();
  const { state, draft, dispatch } = useRoutineDraft();
  const day = dia === 'grupo' ? undefined : findDay(draft, dia);
  const list = dia === 'grupo' ? state.grupo?.ejercicios : day?.ejercicios;

  // Un día que ya no existe (recarga sin borrador, enlace viejo) vuelve a la semana.
  useEffect(() => {
    // Se lee el estado vivo y no `list`: en la primera pasada tras hidratar, el
    // render todavía usa la instantánea de servidor (vacía) y redirigiría mal.
    const live = getRoutineDraft();
    const exists = dia === 'grupo' ? live.grupo !== null : findDay(live.draft, dia) !== undefined;
    if (!exists) router.replace(wizardStepPath(DAYS_STEP));
  }, [dia, router]);

  const pick: PickConfig = {
    isAdded: (id) => list?.some((exercise) => exercise.ejercicioId === id) ?? false,
    add: (exercise) =>
      dispatch({
        type: 'agregarEjercicio',
        destino: dia,
        ejercicio: createDraftExercise(exercise, draft.objetivo),
      }),
    remove: (id) => dispatch({ type: 'quitarEjercicio', destino: dia, ejercicioId: id }),
    onOpen: (id) => router.push(pickDetailPath(id, dia)),
  };

  if (!list) return null;

  const title =
    dia === 'grupo'
      ? 'Configurar seleccionados'
      : [WEEKDAY_NAMES[dia], day?.nombre.trim()].filter(Boolean).join(' · ');
  const scope = dia === 'grupo' && state.grupo ? listDays(state.grupo.dias) : undefined;

  const finish = () => {
    if (dia === 'grupo') dispatch({ type: 'confirmarGrupo' });
    router.push(wizardStepPath(DAYS_STEP));
  };

  return (
    <WizardFrame
      actions={
        <>
          <Button
            disabled={list.length === 0}
            onClick={() => router.push(orderPath(dia))}
            variant="secondary"
          >
            Ver y ordenar
          </Button>
          <Button onClick={finish} variant="primary">
            Listo
          </Button>
        </>
      }
      back={{ href: wizardStepPath(DAYS_STEP), label: 'Volver a la semana' }}
      description={scope ? `${scope}. Elige los ejercicios.` : 'Elige los ejercicios del día.'}
      info={countLabel(list.length)}
      paso={DAYS_STEP}
      title={title}
    >
      <ExerciseBrowser mode="pick" pick={pick} />
    </WizardFrame>
  );
}
