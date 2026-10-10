'use client';

import type { DraftExercise } from '@gymsheet/hooks';
import { routineExerciseLimits as limits } from '@gymsheet/types';
import { ArrowDown, ArrowUp, Timer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

function digits(value: string, max: number): number | null {
  const clean = value.replace(/[^0-9]/gu, '').slice(0, 4);
  return clean === '' ? null : Math.min(Number.parseInt(clean, 10), max);
}

/**
 * Campo numérico con texto propio mientras se edita: puede quedar vacío un
 * instante (borrar «3» para escribir «4») sin que el borrador reciba un valor
 * inválido; al salir del campo vuelve a mostrar el valor del borrador. Sin esto,
 * un campo obligatorio como las series se rellenaba con «1» al borrar y el
 * siguiente dígito se pegaba detrás («14»).
 */
export function NumberField({
  id,
  label,
  value,
  onChange,
}: Readonly<{ id: string; label: string; value: number | null; onChange: (raw: string) => void }>) {
  const [typed, setTyped] = useState<string | null>(null);
  return (
    <Field htmlFor={id} label={label}>
      <Input
        id={id}
        inputMode="numeric"
        onBlur={() => setTyped(null)}
        onChange={(event) => {
          setTyped(event.target.value.replace(/[^0-9]/gu, ''));
          onChange(event.target.value);
        }}
        value={typed ?? value ?? ''}
      />
    </Field>
  );
}

/** Un ejercicio del día: orden con flechas, series, repeticiones, RIR, descanso y nota. */
export function ExerciseEditor({
  exercise,
  position,
  total,
  onMove,
  onRemove,
  onChange,
  onPorTiempo,
  marca,
}: Readonly<{
  exercise: DraftExercise;
  position: number;
  total: number;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onChange: (cambios: Partial<DraftExercise>) => void;
  /** Cambia entre repeticiones (`null`) y serie por tiempo (segundos). */
  onPorTiempo: (duracionSeg: number | null) => void;
  /** «A1», «A2»… dentro de un bloque; sin él, el número de posición. */
  marca?: string;
}>) {
  const key = exercise.uid;
  const setReps = (field: 'repsMin' | 'repsMax', raw: string) =>
    onChange({ [field]: digits(raw, limits.repsMax) });
  const porTiempo = exercise.duracionSeg !== null;
  const invertedReps =
    !porTiempo && exercise.repsMin !== null && exercise.repsMax !== null && exercise.repsMin > exercise.repsMax;
  return (
    <li className="panel grid grid-cols-[minmax(0,1fr)] gap-4 p-5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{`${marca ?? position}. ${exercise.nombre}`}</p>
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
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-3">
        <NumberField
          id={`series-${key}`}
          label="Series"
          onChange={(raw) => {
            const series = digits(raw, limits.seriesMax);
            if (series !== null && series > 0) onChange({ seriesObjetivo: series });
          }}
          value={exercise.seriesObjetivo}
        />
        {porTiempo ? (
          <NumberField
            id={`dur-${key}`}
            label="Duración (s)"
            onChange={(raw) => {
              const seconds = digits(raw, limits.duracionMax);
              if (seconds !== null && seconds > 0) onPorTiempo(seconds);
            }}
            value={exercise.duracionSeg}
          />
        ) : (
          <>
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
          </>
        )}
      </div>
      <div>
        <Button
          aria-label={`${porTiempo ? 'Pasar a repeticiones' : 'Por tiempo'} · ${exercise.nombre}`}
          aria-pressed={porTiempo}
          onClick={() => onPorTiempo(porTiempo ? null : 30)}
          size="sm"
          variant="ghost"
        >
          <Timer aria-hidden className="size-4" />
          {porTiempo ? 'Pasar a repeticiones' : 'Por tiempo'}
        </Button>
      </div>
      {invertedReps ? (
        <p className="text-sm text-[var(--warning-text)]" role="alert">
          El máximo es menor que el mínimo: se guardará igual al mínimo.
        </p>
      ) : null}
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
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
