'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CircleDashed, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Program } from '@gymsheet/types';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList, SkeletonPageHeader, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';
import { programKeys } from '@/features/routines-v2/keys';
import { cardioService, programService } from '@/features/routines-v2/services';
import { sessionMinutesForWeek } from '@/features/cardio/cardio-model';
import { todayIso } from '../activation-model';
import { modeLabel, multiplierLabel, nextMultiplierHint, weekLabel } from '../labels';
import { WEEK_STATE_LABEL, goalProgress, hasEnded, summarizeWeeks, weekState } from '../progress-model';
import { CloseProgram } from './close-program';
import { NextLoadsPanel } from './next-loads-panel';

function GoalBars({ program }: Readonly<{ program: Program }>) {
  if (program.metas.length === 0 || program.modo !== 'STRENGTH_GOALS') return null;
  return (
    <section aria-labelledby="goals-title" className="panel grid gap-4 p-5" data-testid="goals">
      <h2 className="text-lg font-semibold tracking-[-0.02em]" id="goals-title">
        Metas de marca
      </h2>
      <ul className="grid list-none gap-4">
        {program.metas.map((goal) => {
          const fraction = goalProgress(goal);
          return (
            <li className="grid gap-1.5" key={goal.ejercicioId}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{goal.ejercicioNombre ?? 'Ejercicio'}</span>
                <span className="text-sm text-[var(--text-muted)]">
                  {goal.alcanzadaEn
                    ? 'Meta lograda'
                    : `${goal.marcaActualKg ?? goal.marcaInicialKg ?? '–'} → ${goal.marcaMetaKg ?? '–'} kg`}
                </span>
              </div>
              <div
                aria-label={`Avance hacia la meta de ${goal.ejercicioNombre ?? 'ejercicio'}`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.round(fraction * 100)}
                className="h-2 overflow-hidden rounded-full bg-[var(--surface-high)]"
                role="progressbar"
              >
                <div className="h-full rounded-full bg-[var(--volt)]" style={{ width: `${Math.round(fraction * 100)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const isStrengthProgram = (program: Program) => program.carril === 'STRENGTH';

/** El programa: avance por semana, multiplicador, metas, cargas sugeridas y cierre (RF-14..16, RF-19). */
export function ProgramView({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const progress = useQuery({ queryKey: programKeys.progress(id), queryFn: () => programService.progress(id) });
  const stop = useMutation({
    mutationFn: () => programService.stop(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programKeys.all });
      notify.success('Programa detenido.');
      router.push('/routines');
    },
    onError: (error: Error) => notify.error(error),
  });

  const cardioPlanId = progress.data?.programa.cardioPlanId ?? null;
  const plans = useQuery({
    queryKey: programKeys.cardioPlans,
    queryFn: cardioService.listPlans,
    enabled: cardioPlanId !== null,
  });
  const plan = plans.data?.find((candidate) => candidate.id === cardioPlanId) ?? null;

  if (progress.isLoading) {
    return (
      <SkeletonScreen className="gap-8" label="Cargando el programa">
        <SkeletonPageHeader />
        <SkeletonList rows={6} variant="stacked" withAvatar={false} />
      </SkeletonScreen>
    );
  }
  if (progress.isError || !progress.data) {
    return <ErrorPanel message={progress.error?.message ?? 'No encontramos este programa.'} onRetry={() => void progress.refetch()} />;
  }
  const { programa: program, semanas } = progress.data;
  const totals = summarizeWeeks(semanas);
  const active = program.estado === 'ACTIVE';
  const ended = hasEnded(program, todayIso());
  const isStrength = program.carril === 'STRENGTH';

  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          active ? (
            <div className="flex flex-wrap gap-2">
              {!isStrengthProgram(program) ? (
                <ButtonLink href="/cardio/registrar" variant="primary">
                  Registrar sesión
                </ButtonLink>
              ) : null}
              {program.rutinaId ? (
                <ButtonLink href={`/routines/${program.rutinaId}`} variant="secondary">
                  Ver la rutina
                </ButtonLink>
              ) : null}
              <Button
                loading={stop.isPending}
                onClick={async () => {
                  const result = await confirm({
                    title: 'Detener el programa',
                    message: 'Dejará de contar semanas y multiplicador. Lo que ya entrenaste y tus puntos se conservan.',
                    confirmLabel: 'Detener',
                    severity: 'danger',
                  });
                  if (result.confirmed) stop.mutate();
                }}
                variant="ghost"
              >
                Detener programa
              </Button>
            </div>
          ) : null
        }
        description={`${weekLabel(program)} · ${modeLabel(program.modo)}`}
        eyebrow={isStrength ? 'Programa de pesas' : 'Plan de cardio'}
        title={program.rutinaNombre ?? 'Plan de cardio'}
      />

      {!active ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-4 py-3 text-sm text-[var(--text-muted)]" data-testid="program-closed">
          Este programa está cerrado ({program.estado === 'FINISHED' ? 'terminado' : 'detenido'}).
        </p>
      ) : null}
      {ended && isStrength ? <CloseProgram program={program} /> : null}

      <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-3">
        <div className="panel grid gap-1 p-5">
          <p className="data-label text-[var(--text-muted)]">Multiplicador</p>
          <p className="text-3xl font-semibold tracking-[-0.03em] text-[var(--accent-ink)]" data-testid="multiplier">
            {multiplierLabel(program.multiplicador)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{active && !ended ? nextMultiplierHint(program) : 'El programa terminó.'}</p>
        </div>
        <div className="panel grid gap-1 p-5">
          <p className="data-label text-[var(--text-muted)]">Semanas cumplidas</p>
          <p className="text-3xl font-semibold tracking-[-0.03em]">
            {totals.cumplidas} <span className="text-lg text-[var(--text-muted)]">de {totals.cerradas} cerradas</span>
          </p>
        </div>
        <div className="panel grid gap-1 p-5">
          <p className="data-label text-[var(--text-muted)]">Sesiones</p>
          <p className="text-3xl font-semibold tracking-[-0.03em]">
            {totals.sesionesHechas} <span className="text-lg text-[var(--text-muted)]">de {totals.sesionesPlan}</span>
          </p>
        </div>
      </section>

      {active && isStrength && program.modo !== 'NONE' ? <NextLoadsPanel programId={id} /> : null}
      <GoalBars program={program} />

      <section aria-labelledby="weeks-title" className="panel overflow-hidden">
        <h2 className="border-b border-[var(--border-subtle)] p-5 text-lg font-semibold tracking-[-0.02em]" id="weeks-title">
          Semana a semana
        </h2>
        <ol className="list-none divide-y divide-[var(--border-subtle)]">
          {semanas.map((week) => {
            const state = weekState(week, program.semanaActual);
            const Icon = state === 'cumplida' ? Check : state === 'incumplida' ? X : CircleDashed;
            return (
              <li className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm" data-testid={`week-${week.numero}`} key={week.numero}>
                <span className="w-10 font-semibold">S{week.numero}</span>
                <span className="inline-flex min-w-28 items-center gap-1.5">
                  <Icon aria-hidden className="size-4" />
                  {WEEK_STATE_LABEL[state]}
                </span>
                <span className="text-[var(--text-muted)]">
                  {isStrength
                    ? `${week.sesionesHechas} de ${week.sesionesPlan} sesiones`
                    : `${week.minutosCardio}${plan ? ` / ${sessionMinutesForWeek(plan.minutosObjetivo, plan.progresionPctSemana, week.numero) * week.sesionesPlan}` : ''} min · ${week.sesionesHechas} de ${week.sesionesPlan} sesiones`}
                </span>
                {week.esDescarga ? (
                  <Badge latido={false} tone="warning">
                    Descarga
                  </Badge>
                ) : null}
                {week.multiplicador !== null ? (
                  <span className="ml-auto font-semibold">{multiplierLabel(week.multiplicador)}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
