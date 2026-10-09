'use client';

import {
  WEEKDAYS,
  WEEKDAY_NAMES,
  countLabel,
  findDay,
  type DayTarget,
  type Weekday,
} from '@gymsheet/hooks';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { confirm, notify } from '@/shared/notifications';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { getRoutineDraft, useRoutineDraft } from '../draft-store';
import { dayPath, wizardStepPath } from '../paths';
import { ExerciseEditor } from './exercise-editor';
import { WizardFrame } from './wizard-frame';

const DAYS_STEP = 4;

/**
 * «Ver y ordenar» el día: reordenar, editar series, repeticiones, RIR, descanso y
 * nota, renombrar el día, duplicarlo en otros y vaciarlo. El orden se cambia con
 * botones (funciona con teclado y lector de pantalla).
 */
export function DayOrder({ dia }: Readonly<{ dia: DayTarget }>) {
  const router = useRouter();
  const { state, draft, dispatch } = useRoutineDraft();
  const day = dia === 'grupo' ? undefined : findDay(draft, dia);
  const list = dia === 'grupo' ? state.grupo?.ejercicios : day?.ejercicios;

  useEffect(() => {
    // Se lee el estado vivo y no `list`: en la primera pasada tras hidratar, el
    // render todavía usa la instantánea de servidor (vacía) y redirigiría mal.
    const live = getRoutineDraft();
    const exists = dia === 'grupo' ? live.grupo !== null : findDay(live.draft, dia) !== undefined;
    if (!exists) router.replace(wizardStepPath(DAYS_STEP));
  }, [dia, router]);
  if (!list) return null;

  const others = WEEKDAYS.filter(
    (candidate): candidate is Weekday =>
      candidate !== dia && findDay(draft, candidate) !== undefined,
  );

  const clear = async () => {
    const result = await confirm({
      title: '¿Vaciar el día?',
      message: 'Se quitarán todos sus ejercicios.',
      severity: 'danger',
      confirmLabel: 'Vaciar',
    });
    if (!result.confirmed) return;
    if (dia === 'grupo') {
      list.forEach((e) =>
        dispatch({ type: 'quitarEjercicio', destino: dia, ejercicioId: e.ejercicioId }),
      );
    } else {
      dispatch({ type: 'vaciarDia', dia });
    }
    router.push(dayPath(dia));
  };

  return (
    <WizardFrame
      actions={
        <Button onClick={() => router.push(dayPath(dia))} variant="primary">
          Listo
        </Button>
      }
      back={{ href: dayPath(dia), label: 'Volver al día' }}
      description="Ordena los ejercicios y ajusta series, repeticiones y descanso."
      info={countLabel(list.length)}
      paso={4}
      title={dia === 'grupo' ? 'Ver y ordenar' : `${WEEKDAY_NAMES[dia]} · Ver y ordenar`}
    >
      {day && dia !== 'grupo' ? (
        <Field htmlFor="day-name" label="Nombre del día">
          <Input
            id="day-name"
            maxLength={60}
            onChange={(event) =>
              dispatch({ type: 'renombrarDia', dia, nombre: event.target.value })
            }
            placeholder="Ej. Empuje"
            value={day.nombre}
          />
        </Field>
      ) : null}

      <ol aria-label="Ejercicios del día" className="grid grid-cols-[minmax(0,1fr)] gap-4">
        {list.map((exercise, index) => (
          <ExerciseEditor
            exercise={exercise}
            key={exercise.ejercicioId}
            onChange={(cambios) =>
              dispatch({
                type: 'editarEjercicio',
                destino: dia,
                ejercicioId: exercise.ejercicioId,
                cambios,
              })
            }
            onMove={(delta) =>
              dispatch({ type: 'moverEjercicio', destino: dia, desde: index, hacia: index + delta })
            }
            onRemove={() =>
              dispatch({ type: 'quitarEjercicio', destino: dia, ejercicioId: exercise.ejercicioId })
            }
            position={index + 1}
            total={list.length}
          />
        ))}
      </ol>

      {dia !== 'grupo' && others.length > 0 && list.length > 0 ? (
        <fieldset className="grid gap-3">
          <legend className="data-label mb-3">Duplicar en…</legend>
          <div className="flex flex-wrap gap-3">
            {others.map((other) => (
              <ChoiceChip
                aria-label={`Duplicar en ${WEEKDAY_NAMES[other].toLowerCase()}`}
                key={other}
                onClick={() => {
                  dispatch({ type: 'duplicarDia', desde: dia, hacia: [other] });
                  notify.success(`Copiado al ${WEEKDAY_NAMES[other].toLowerCase()}.`);
                }}
                selected={false}
              >
                {WEEKDAY_NAMES[other].slice(0, 3)}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>
      ) : null}

      {list.length > 0 ? (
        <div>
          <Button onClick={() => void clear()} variant="danger">
            <Trash2 className="size-4" />
            Vaciar el día
          </Button>
        </div>
      ) : null}
    </WizardFrame>
  );
}
