'use client';

import { blockLetter, type DayTarget, type DraftExercise, type WizardAction } from '@gymsheet/hooks';
import { routineExerciseLimits as limits } from '@gymsheet/types';
import { Link2, Unlink } from 'lucide-react';
import { Fragment } from 'react';
import { Button } from '@/shared/components/ui/button';
import { ExerciseEditor, NumberField } from './exercise-editor';

type Run = { grupo: number | null; items: Array<{ exercise: DraftExercise; index: number }> };

/** Corridas contiguas con el mismo bloque; un ejercicio suelto es una corrida de uno. */
function runsOf(list: readonly DraftExercise[]): Run[] {
  const runs: Run[] = [];
  list.forEach((exercise, index) => {
    const last = runs[runs.length - 1];
    if (last && exercise.grupo !== null && last.grupo === exercise.grupo) {
      last.items.push({ exercise, index });
    } else {
      runs.push({ grupo: exercise.grupo, items: [{ exercise, index }] });
    }
  });
  return runs;
}

/**
 * Los ejercicios del día con sus bloques (C3.d): cada superserie o circuito va en
 * su recuadro, con «Separar» y el descanso entre ejercicios; entre dos filas que
 * aún no comparten bloque hay «Unir con el siguiente».
 */
export function DayOrderList({
  list,
  destino,
  dispatch,
}: Readonly<{
  list: readonly DraftExercise[];
  destino: DayTarget;
  dispatch: (action: WizardAction) => void;
}>) {
  const runs = runsOf(list);
  const blocks = runs.filter((run) => run.grupo !== null && run.items.length >= 2);
  const row = (exercise: DraftExercise, index: number, marca?: string) => (
    <ExerciseEditor
      exercise={exercise}
      key={exercise.uid}
      marca={marca}
      onChange={(cambios) => dispatch({ type: 'editarEjercicio', destino, uid: exercise.uid, cambios })}
      onMove={(delta) =>
        dispatch({ type: 'moverEjercicio', destino, desde: index, hacia: index + delta })
      }
      onPorTiempo={(duracionSeg) =>
        dispatch({ type: 'setPorTiempo', destino, uid: exercise.uid, duracionSeg })
      }
      onRemove={() => dispatch({ type: 'quitarEjercicio', destino, uid: exercise.uid })}
      position={index + 1}
      total={list.length}
    />
  );
  return (
    <ol aria-label="Ejercicios del día" className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {runs.map((run, runIndex) => {
        const first = run.items[0];
        if (!first) return null;
        const next = runs[runIndex + 1]?.items[0];
        const last = run.items[run.items.length - 1] ?? first;
        const join = next ? (
          <li className="flex justify-center" key={`join-${last.exercise.uid}`}>
            <Button
              aria-label={`Unir ${last.exercise.nombre} con ${next.exercise.nombre}`}
              onClick={() =>
                dispatch({ type: 'unirEnGrupo', destino, uids: [last.exercise.uid, next.exercise.uid] })
              }
              size="sm"
              variant="ghost"
            >
              <Link2 aria-hidden className="size-4" />
              Unir con el siguiente
            </Button>
          </li>
        ) : null;
        if (run.grupo === null || run.items.length < 2) {
          return (
            <Fragment key={first.exercise.uid}>
              {row(first.exercise, first.index)}
              {join}
            </Fragment>
          );
        }
        const label = blockLetter(blocks.indexOf(run));
        const kind = run.items.length >= 3 ? 'Circuito' : 'Superserie';
        const grupo = run.grupo;
        return (
          <Fragment key={`bloque-${first.exercise.uid}`}>
            <li
              aria-label={`${kind} ${label}`}
              className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--volt)] bg-[var(--surface-low)] p-4"
              data-testid="draft-block"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="grid gap-1">
                  <p className="data-label text-[var(--accent-ink)]">{`${kind} ${label}`}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Los ejercicios se hacen seguidos y se descansa al terminar la vuelta.
                  </p>
                </div>
                <div className="flex items-end gap-3">
                  <div className="w-44">
                    <NumberField
                      id={`entre-${first.exercise.uid}`}
                      label="Descanso entre ejercicios (s)"
                      onChange={(raw) => {
                        const value = Number.parseInt(raw.replace(/[^0-9]/gu, '') || '0', 10);
                        dispatch({
                          type: 'setDescansoEntre',
                          destino,
                          grupo,
                          descansoEntreSeg: Math.min(value, limits.descansoEntreMax),
                        });
                      }}
                      value={first.exercise.descansoEntreSeg ?? 0}
                    />
                  </div>
                  <Button
                    aria-label={`Separar ${kind.toLowerCase()} ${label}`}
                    onClick={() => dispatch({ type: 'separarGrupo', destino, grupo })}
                    variant="secondary"
                  >
                    <Unlink aria-hidden className="size-4" />
                    Separar
                  </Button>
                </div>
              </div>
              <ol className="grid grid-cols-[minmax(0,1fr)] gap-4">
                {run.items.map((item, position) => row(item.exercise, item.index, `${label}${position + 1}`))}
              </ol>
            </li>
            {join}
          </Fragment>
        );
      })}
    </ol>
  );
}
