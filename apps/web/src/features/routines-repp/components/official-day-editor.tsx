'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { ExerciseSearch } from './exercise-search';
import { WEEKDAYS, type DraftDay, type DraftExercise } from './official-form-model';

function numberOrNull(value: string): number | null {
  return value === '' ? null : Number(value);
}

/** Un día de la rutina oficial: su día de la semana, su nombre y sus ejercicios. */
export function OfficialDayEditor({
  day,
  index,
  onChange,
  onRemove,
}: Readonly<{
  day: DraftDay;
  index: number;
  onChange: (day: DraftDay) => void;
  onRemove: () => void;
}>) {
  const patchExercise = (key: string, patch: Partial<DraftExercise>) =>
    onChange({
      ...day,
      ejercicios: day.ejercicios.map((e) => (e.key === key ? { ...e, ...patch } : e)),
    });

  return (
    <fieldset className="flex flex-col gap-3 rounded-[8px] border border-[var(--border-subtle)] p-4">
      <legend className="px-1 text-sm font-semibold">Día {index + 1}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre del día (opcional)">
          <Input
            maxLength={60}
            onChange={(event) => onChange({ ...day, nombre: event.target.value })}
            value={day.nombre}
          />
        </Field>
        <Field label="Día de la semana">
          <Select
            onChange={(event) =>
              onChange({ ...day, diaSemana: numberOrNull(event.target.value) })
            }
            value={day.diaSemana ?? ''}
          >
            <option value="">Sin día fijo</option>
            {WEEKDAYS.map((label, weekday) => (
              <option key={label} value={weekday + 1}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <ul className="flex flex-col gap-2">
        {day.ejercicios.map((exercise) => (
          <li
            className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-[4px] bg-[var(--surface-low)] p-3"
            key={exercise.key}
          >
            <p className="col-span-2 text-sm font-medium">{exercise.nombre}</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Series">
                <Input
                  inputMode="numeric"
                  max={100}
                  min={1}
                  onChange={(event) =>
                    patchExercise(exercise.key, { series: Math.max(1, Number(event.target.value) || 1) })
                  }
                  type="number"
                  value={exercise.series}
                />
              </Field>
              <Field label="Reps mín.">
                <Input
                  inputMode="numeric"
                  min={1}
                  onChange={(event) =>
                    patchExercise(exercise.key, { repsMin: numberOrNull(event.target.value) })
                  }
                  type="number"
                  value={exercise.repsMin ?? ''}
                />
              </Field>
              <Field label="Reps máx.">
                <Input
                  inputMode="numeric"
                  min={1}
                  onChange={(event) =>
                    patchExercise(exercise.key, { repsMax: numberOrNull(event.target.value) })
                  }
                  type="number"
                  value={exercise.repsMax ?? ''}
                />
              </Field>
            </div>
            <Button
              aria-label={`Quitar ${exercise.nombre}`}
              onClick={() =>
                onChange({ ...day, ejercicios: day.ejercicios.filter((e) => e.key !== exercise.key) })
              }
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <ExerciseSearch
        onPick={(picked) =>
          onChange({
            ...day,
            ejercicios: [
              ...day.ejercicios,
              {
                key: crypto.randomUUID(),
                ejercicioId: picked.id,
                nombre: picked.nombre,
                series: 3,
                repsMin: 8,
                repsMax: 12,
              },
            ],
          })
        }
      />

      <Button className="w-fit" onClick={onRemove} size="sm" type="button" variant="ghost">
        Quitar este día
      </Button>
    </fieldset>
  );
}
