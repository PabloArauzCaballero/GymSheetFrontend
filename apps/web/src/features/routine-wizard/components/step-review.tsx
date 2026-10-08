'use client';

import { ApiError } from '@gymsheet/api-client';
import {
  GOAL_LABELS,
  describeSaveError,
  evaluateQuality,
  monthColumns,
  planWeeks,
  saveRoutineDraft,
  summarizeStructure,
  toggledWeekChoice,
  type QualityIssue,
} from '@gymsheet/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, CircleX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { notify } from '@/shared/notifications';
import { dispatchRoutineDraft, useRoutineDraft } from '../draft-store';
import { wizardStepPath } from '../paths';
import { routineBuilderService } from '../services';
import { RoutineMonthGrid } from './routine-month-grid';
import { WizardFrame } from './wizard-frame';

function IssueRow({ issue, blocking }: Readonly<{ issue: QualityIssue; blocking: boolean }>) {
  const Icon = blocking ? CircleX : CircleAlert;
  return (
    <li className="flex items-start gap-3 text-sm leading-6">
      <Icon
        aria-hidden
        className={
          blocking
            ? 'mt-0.5 size-4 text-[var(--danger-text)]'
            : 'mt-0.5 size-4 text-[var(--warning-text)]'
        }
      />
      <span>
        <span className="sr-only">{blocking ? 'Bloquea: ' : 'Aviso: '}</span>
        {issue.mensaje}
      </span>
    </li>
  );
}

/** Paso 6: vista Mes con la progresión, avisos de calidad y guardado. */
export function ReviewStep() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { draft, dispatch } = useRoutineDraft();
  const [week, setWeek] = useState<number | null>(null);

  const quality = useMemo(() => evaluateQuality(draft), [draft]);
  const weeks = useMemo(() => planWeeks(draft), [draft]);
  const columns = useMemo(() => monthColumns(draft), [draft]);
  const selectedWeek = week === null ? null : weeks.find((candidate) => candidate.numero === week);

  const save = useMutation({
    mutationFn: () =>
      saveRoutineDraft(routineBuilderService, draft, (routineId) =>
        dispatch({ type: 'guardado', routineId }),
      ),
    onSuccess: async ({ routine, semanasFallidas }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.routines('mine') });
      if (semanasFallidas.length > 0) {
        notify.warning(
          `Rutina guardada, pero no pudimos ajustar las semanas ${semanasFallidas.join(', ')}.`,
        );
      } else {
        notify.success('Rutina creada.');
      }
      dispatchRoutineDraft({ type: 'reiniciar' });
      router.push(`/routines/${routine.id}`);
    },
    onError: (error) => {
      const view = describeSaveError(
        error instanceof ApiError ? error : { message: 'Ocurrió un error inesperado.' },
      );
      notify.error({ title: view.titulo, message: view.mensaje });
      if (view.paso !== undefined) router.push(wizardStepPath(view.paso));
    },
  });

  return (
    <WizardFrame
      actions={
        <Button
          disabled={quality.bloqueos.length > 0}
          loading={save.isPending}
          onClick={() => save.mutate()}
          variant="primary"
        >
          Guardar
        </Button>
      }
      description="Revisa la progresión y los avisos antes de guardar."
      info={
        quality.bloqueos.length > 0 ? 'Resuelve lo marcado para guardar' : summarizeStructure(draft)
      }
      paso={5}
      title="Revisión"
    >
      <section aria-label="Resumen" className="panel grid gap-1 p-5">
        <h2 className="text-lg font-semibold">{draft.nombre.trim()}</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {[
            draft.objetivo ? GOAL_LABELS[draft.objetivo] : null,
            summarizeStructure(draft),
            'Privada',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </section>

      {quality.bloqueos.length + quality.avisos.length > 0 ? (
        <section aria-label="Avisos" className="panel grid gap-3 p-5">
          <h2 className="data-label">Avisos</h2>
          <ul className="grid gap-3">
            {quality.bloqueos.map((issue) => (
              <IssueRow blocking issue={issue} key={`${issue.codigo}-${issue.dia}`} />
            ))}
            {quality.avisos.map((issue) => (
              <IssueRow blocking={false} issue={issue} key={`${issue.codigo}-${issue.mensaje}`} />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Vista Mes" className="grid gap-3">
        <h2 className="data-label">Vista Mes</h2>
        <RoutineMonthGrid
          columnas={columns}
          onSelectWeek={(numero) => setWeek(week === numero ? null : numero)}
          seleccionada={week}
          semanas={weeks}
        />
        {selectedWeek ? (
          <div className="panel grid gap-3 p-4">
            <p className="text-sm font-semibold">{`Semana ${selectedWeek.numero}`}</p>
            <div className="flex gap-3" role="group" aria-label={`Semana ${selectedWeek.numero}`}>
              {(['DESCARGA', 'NORMAL'] as const).map((choice) => {
                const isDeload = choice === 'DESCARGA';
                return (
                  <ChoiceChip
                    key={choice}
                    onClick={() => {
                      if (isDeload !== selectedWeek.esDescarga) {
                        dispatch({
                          type: 'ajustarSemana',
                          numero: selectedWeek.numero,
                          eleccion: toggledWeekChoice(draft, selectedWeek.numero),
                        });
                      }
                    }}
                    selected={isDeload ? selectedWeek.esDescarga : !selectedWeek.esDescarga}
                  >
                    {isDeload ? 'Descarga' : 'Normal'}
                  </ChoiceChip>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            Toca una semana para marcarla como descarga o normal.
          </p>
        )}
      </section>
    </WizardFrame>
  );
}
