'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Equal, Trophy } from 'lucide-react';
import { useState } from 'react';
import type { CardioSessionExtras, ProgramSessionExtras } from '@gymsheet/types';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { programKeys, routineV2Keys } from '@/features/routines-v2/keys';
import { programService } from '@/features/routines-v2/services';
import { multiplierLabel } from '@/features/programs/labels';
import { queryKeys } from '@/shared/api/query-keys';
import { routineBuilderService } from '@/features/routine-wizard/services';
import { describeProposal } from './proposal-text';

const ICON = { RAISE: ArrowUp, LOWER: ArrowDown, GOAL_REACHED: Trophy, E1RM_UP: ArrowUp } as const;

/**
 * Lo que el programa dice de la sesión recién terminada (RF-15, RF-16, RF-20):
 * bono de modo con el multiplicador, qué cambia en las cargas, y la hoja
 * «¿Actualizar la rutina con estos cambios?» con [Actualizar] y [Solo esta vez].
 */
export function ProgramSessionPanel({
  sessionId,
  programa,
  cardio,
  sessionNames,
}: Readonly<{ sessionId: string; sessionNames?: ReadonlyMap<string, string>; programa: ProgramSessionExtras | null; cardio: CardioSessionExtras | null }>) {
  const queryClient = useQueryClient();
  // Los nombres de los ejercicios de la propuesta salen de la rutina del programa.
  const programId = programa?.cambiosRespectoRutina ? programa.programId : null;
  const progress = useQuery({
    queryKey: programKeys.progress(programId ?? ''),
    queryFn: () => programService.progress(programId ?? ''),
    enabled: programId !== null,
  });
  const routineId = progress.data?.programa.rutinaId ?? null;
  const routine = useQuery({
    queryKey: queryKeys.routine(routineId ?? ''),
    queryFn: () => routineBuilderService.get(routineId ?? ''),
    enabled: routineId !== null,
  });
  // Los de la sesión cubren lo que se añadió y no está en la rutina todavía.
  const names = new Map<string, string>(sessionNames ?? []);
  for (const day of routine.data?.dias ?? []) {
    for (const exercise of day.ejercicios) {
      names.set(exercise.id, exercise.ejercicio?.nombre ?? 'Ejercicio');
      if (exercise.ejercicio) names.set(exercise.ejercicio.id, exercise.ejercicio.nombre);
    }
  }
  const [answered, setAnswered] = useState<'actualizada' | 'solo-esta-vez' | null>(null);
  const apply = useMutation({
    mutationFn: () => programService.applyToRoutine(sessionId, programa?.propuesta ?? {}),
    onSuccess: async () => {
      setAnswered('actualizada');
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.all });
      await queryClient.invalidateQueries({ queryKey: programKeys.all });
      if (routineId) await queryClient.invalidateQueries({ queryKey: queryKeys.routine(routineId) });
      notify.success('Rutina actualizada.');
    },
    onError: (error: Error) => notify.error(error),
  });
  if (!programa && !cardio) return null;
  const lines = programa ? describeProposal(programa.propuesta, names) : [];
  return (
    <section aria-label="Tu programa" className="grid gap-4" data-testid="program-session">
      {programa ? (
        <div className="grid gap-3 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5">
          <p className="text-sm font-semibold">
            Semana {programa.semana ?? '–'} · {programa.sesionesHechasSemana} de {programa.sesionesPlanSemana} sesiones
            {programa.esDescarga ? ' · descarga' : ''}
          </p>
          {!programa.sesionCuenta ? (
            <p className="text-sm text-[var(--text-muted)]" data-testid="session-not-counted">
              {programa.motivoNoCuenta ?? 'Esta sesión no cuenta para el programa.'}
            </p>
          ) : null}
          {programa.bonusModo ? (
            <p className="flex items-baseline justify-between gap-3 text-sm" data-testid="mode-bonus">
              <span className="text-[var(--text-muted)]">Bono del modo ({multiplierLabel(programa.bonusModo.proximoMultiplicador)} si cumples la semana)</span>
              <span className="font-semibold tabular-nums text-[var(--accent-ink)]">+{programa.bonusModo.puntosPrevistos.toLocaleString('es')} pts previstos</span>
            </p>
          ) : null}
          {programa.sugerencias.length > 0 ? (
            <ul aria-label="Tus cargas" className="grid list-none gap-2">
              {programa.sugerencias.map((item) => {
                const Icon = (ICON as Record<string, typeof Equal>)[item.accion] ?? Equal;
                return (
                  <li className="flex items-start gap-2 text-sm" key={item.ejercicioId}>
                    <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--accent-ink)]" />
                    <span>
                      <strong>{item.ejercicioNombre ?? 'Ejercicio'}</strong>: {item.mensaje}
                      {item.pesoSugeridoKg ? ` Próxima: ${item.pesoSugeridoKg.toLocaleString('es')} kg.` : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {cardio ? (
        <div className="grid gap-1 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5 text-sm" data-testid="cardio-session">
          <p className="font-semibold">
            Cardio: {Math.round(cardio.minutosCuentan)} min cuentan · {Math.round(cardio.minutosSemana)} / {Math.round(cardio.objetivoMinutosSemana)} min esta semana
          </p>
          {!cardio.sesionCuenta ? <p className="text-[var(--text-muted)]">Para contar necesitas al menos 10 minutos.</p> : null}
          {cardio.consejo.reason ? <p className="text-[var(--text-muted)]">{cardio.consejo.reason}</p> : null}
        </div>
      ) : null}

      {programa?.cambiosRespectoRutina && answered === null ? (
        <div className="grid gap-3 rounded-3xl border border-[var(--volt)] bg-[var(--surface-low)] p-5" data-testid="update-routine">
          <h3 className="text-base font-semibold">¿Actualizar la rutina con estos cambios?</h3>
          <ul aria-label="Cambios" className="list-disc pl-5 text-sm">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button loading={apply.isPending} onClick={() => apply.mutate()} variant="primary">
              Actualizar
            </Button>
            <Button disabled={apply.isPending} onClick={() => setAnswered('solo-esta-vez')} variant="secondary">
              Solo esta vez
            </Button>
          </div>
        </div>
      ) : null}
      {answered === 'actualizada' ? (
        <p className="text-sm font-semibold text-[var(--success-text)]" role="status">
          Rutina actualizada con los cambios de esta sesión.
        </p>
      ) : null}
      {answered === 'solo-esta-vez' ? (
        <p className="text-sm text-[var(--text-muted)]" role="status">
          Listo: la rutina no cambia.
        </p>
      ) : null}
    </section>
  );
}
