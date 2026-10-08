'use client';

import {
  WEEKDAYS,
  WEEKDAY_NAMES,
  countLabel,
  findDay,
  type DayTarget,
  type DraftExercise,
  type Weekday,
} from '@gymsheet/hooks';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { confirm, notify } from '@/shared/notifications';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { getRoutineDraft, useRoutineDraft } from '../draft-store';
import { dayPath, wizardStepPath } from '../paths';
import { WizardFrame } from './wizard-frame';

const DAYS_STEP = 4;

function digits(value: string, max: number): number | null {
  const clean = value.replace(/[^0-9]/gu, '').slice(0, 4);
  return clean === '' ? null : Math.min(Number.parseInt(clean, 10), max);
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: Readonly<{ id: string; label: string; value: number | null; onChange: (raw: string) => void }>) {
  return (
    <Field htmlFor={id} label={label}>
      <Input
        id={id}
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        value={value ?? ''}
      />
    </Field>
  );
}

/** Un ejercicio del día: orden con flechas, series, repeticiones, RIR, descanso y nota. */
function ExerciseEditor({
  exercise,
  position,
  total,
  onMove,
  onRemove,
  onChange,
}: Readonly<{
  exercise: DraftExercise;
  position: number;
  total: number;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onChange: (cambios: Partial<DraftExercise>) => void;
}>) {
  const key = exercise.ejercicioId;
  const setReps = (field: 'repsMin' | 'repsMax', raw: string) => {
    const next = digits(raw, 1000);
    const other = field === 'repsMin' ? exercise.repsMax : exercise.repsMin;
    // Un rango invertido (12–8) es un descuido: se ajusta el otro extremo en vez
    // de dejar que el servidor rechace toda la rutina.
    const fix =
      next !== null && other !== null && (field === 'repsMin' ? next > other : next < other)
        ? { [field === 'repsMin' ? 'repsMax' : 'repsMin']: next }
        : {};
    onChange({ [field]: next, ...fix });
  };
  return (
    <li className="panel grid gap-4 p-5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{`${position}. ${exercise.nombre}`}</p>
          <p className="text-sm text-[var(--text-muted)]">{exercise.grupoMuscular}</p>
        </div>
        <Button
          aria-label={`Subir ${exercise.nombre}`}
          disabled={position === 1}
          onClick={() => onMove(-1)}
          size="icon"
          variant="ghost"
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          aria-label={`Bajar ${exercise.nombre}`}
          disabled={position === total}
          onClick={() => onMove(1)}
          size="icon"
          variant="ghost"
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button
          aria-label={`Quitar ${exercise.nombre}`}
          onClick={onRemove}
          size="icon"
          variant="ghost"
        >
          <Trash2 className="size-4 text-[var(--danger-text)]" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <NumberField
          id={`series-${key}`}
          label="Series"
          onChange={(raw) => onChange({ seriesObjetivo: digits(raw, 100) ?? 1 })}
          value={exercise.seriesObjetivo}
        />
        <NumberField
          id={`min-${key}`}
          label="Reps mín."
          onChange={(raw) => setReps('repsMin', raw)}
          value={exercise.repsMin}
        />
        <NumberField
          id={`max-${key}`}
          label="Reps máx."
          onChange={(raw) => setReps('repsMax', raw)}
          value={exercise.repsMax}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          id={`rir-${key}`}
          label="RIR"
          onChange={(raw) => onChange({ rirObjetivo: digits(raw, 10) })}
          value={exercise.rirObjetivo}
        />
        <NumberField
          id={`rest-${key}`}
          label="Descanso (s)"
          onChange={(raw) => onChange({ descansoSeg: digits(raw, 7200) })}
          value={exercise.descansoSeg}
        />
      </div>
      <Field htmlFor={`nota-${key}`} label="Nota">
        <Input
          id={`nota-${key}`}
          maxLength={1000}
          onChange={(event) =>
            onChange({ nota: event.target.value === '' ? null : event.target.value })
          }
          placeholder="Ej. Pausa de 1 s abajo"
          value={exercise.nota ?? ''}
        />
      </Field>
    </li>
  );
}

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

      <ol aria-label="Ejercicios del día" className="grid gap-4">
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
