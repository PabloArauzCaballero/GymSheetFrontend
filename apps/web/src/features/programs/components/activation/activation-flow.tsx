'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ActiveProgramSummary, ProgramMode } from '@gymsheet/types';
import { ApiError } from '@/shared/api/api-error';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList, SkeletonPageHeader, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { queryKeys } from '@/shared/api/query-keys';
import { routineBuilderService } from '@/features/routine-wizard/services';
import { programKeys, routineV2Keys } from '@/features/routines-v2/keys';
import { programService } from '@/features/routines-v2/services';
import {
  buildActivationInput,
  createDraft,
  hasErrors,
  validateDraft,
  type ActivationDraft,
  type DraftErrors,
  type LiftDraft,
} from '../../activation-model';
import { ActivationFrame, type ActivationStepId } from './activation-frame';
import { StepData } from './step-data';
import { StepDates } from './step-dates';
import { StepMode } from './step-mode';
import { StepReplace } from './step-replace';
import { StepSummary } from './step-summary';

/**
 * Activar una rutina como programa de pesas (RF-14..16): [Reemplazo] → Fechas →
 * Modo → [Datos del modo] → Resumen. El reemplazo solo aparece si el servidor
 * responde `409 PROGRAM_ACTIVE_CONFLICT`; los datos, solo si hay un modo.
 */
export function ActivationFlow({ routineId }: Readonly<{ routineId: string }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const routine = useQuery({ queryKey: queryKeys.routine(routineId), queryFn: () => routineBuilderService.get(routineId) });
  const active = useQuery({ queryKey: programKeys.active, queryFn: programService.active });
  const [draft, setDraft] = useState<ActivationDraft | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [conflict, setConflict] = useState<ActiveProgramSummary | null>(null);
  const [confirmedReplace, setConfirmedReplace] = useState(false);

  const current = draft ?? (routine.data ? createDraft(routine.data) : null);
  const existing = active.data?.fuerza ?? null;
  const willReplace = confirmedReplace || existing !== null;

  const steps: ActivationStepId[] = [
    ...(existing || conflict ? (['reemplazo'] as const) : []),
    'fechas',
    'modo',
    ...(current && current.modo !== 'NONE' ? (['datos'] as const) : []),
    'resumen',
  ];
  const step = steps[Math.min(stepIndex, steps.length - 1)] ?? 'fechas';

  const activate = useMutation({
    mutationFn: (replace: boolean) =>
      programService.activateStrength(buildActivationInput(routineId, current as ActivationDraft, { replace })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programKeys.all });
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.all });
      notify.success('Programa activado. ¡A entrenar!');
      router.push(current?.conCardio ? '/cardio/new' : '/routines');
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === 'PROGRAM_ACTIVE_CONFLICT') {
        const summary = (error.details as { activeProgram?: ActiveProgramSummary } | undefined)?.activeProgram;
        setConflict(summary ?? { id: '', rutinaNombre: null, semanaActual: null, semanasTotales: 0 });
        setStepIndex(0);
        return;
      }
      notify.error(error);
    },
  });

  if (routine.isLoading || active.isLoading) {
    return (
      <SkeletonScreen className="gap-8" label="Preparando la activación">
        <SkeletonPageHeader />
        <SkeletonList rows={4} variant="stacked" withAvatar={false} />
      </SkeletonScreen>
    );
  }
  if (routine.isError || !routine.data || !current) {
    return <ErrorPanel message={routine.error?.message ?? 'No encontramos esta rutina.'} onRetry={() => void routine.refetch()} />;
  }

  const update = (patch: Partial<ActivationDraft>) => {
    setDraft({ ...current, ...patch });
    setErrors({});
  };
  const updateLift = (ejercicioId: string, patch: Partial<LiftDraft>) =>
    update({ lifts: current.lifts.map((lift) => (lift.ejercicioId === ejercicioId ? { ...lift, ...patch } : lift)) });
  const summary: ActiveProgramSummary | null =
    conflict ??
    (existing
      ? {
          id: existing.id,
          rutinaNombre: existing.rutinaNombre,
          semanaActual: existing.semanaActual,
          semanasTotales: existing.semanasTotales,
        }
      : null);

  const next = () => {
    if (step === 'fechas' || step === 'datos') {
      const found = validateDraft(current);
      const relevant: DraftErrors =
        step === 'fechas'
          ? { ...(found.semanas ? { semanas: found.semanas } : {}), ...(found.dias ? { dias: found.dias } : {}) }
          : { ...(found.lifts ? { lifts: found.lifts } : {}), ...(found.lift ? { lift: found.lift } : {}) };
      if (hasErrors(relevant)) {
        setErrors(relevant);
        return;
      }
    }
    if (step === 'reemplazo') setConfirmedReplace(true);
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };
  const back = () => setStepIndex((index) => Math.max(index - 1, 0));

  const copy: Record<ActivationStepId, { title: string; description: string }> = {
    reemplazo: { title: 'Ya tienes un programa de pesas', description: 'Solo uno a la vez; el cardio no se toca.' },
    fechas: { title: 'Fechas y días', description: `Cuándo empiezas «${routine.data.nombre}» y qué días entrenas.` },
    modo: { title: 'Elige un modo', description: 'Puedes seguir la rutina tal cual o sumar progresión y metas.' },
    datos: {
      title: current.modo === 'STRENGTH_GOALS' ? 'Tus marcas y metas' : 'Tus cargas de partida',
      description:
        current.modo === 'STRENGTH_GOALS'
          ? 'Dinos dónde estás y adónde quieres llegar en cada levantamiento.'
          : 'Con qué peso y repeticiones empiezas en cada ejercicio principal.',
    },
    resumen: { title: 'Todo listo', description: 'Revisa y activa. Podrás detener el programa cuando quieras.' },
  };
  const isLast = step === 'resumen';

  return (
    <ActivationFrame
      actions={
        <>
          {stepIndex > 0 ? (
            <Button disabled={activate.isPending} onClick={back} variant="ghost">
              Atrás
            </Button>
          ) : null}
          {isLast ? (
            <Button loading={activate.isPending} onClick={() => activate.mutate(confirmedReplace)} variant="primary">
              {willReplace ? 'Apagar y activar' : 'Activar'}
            </Button>
          ) : (
            <Button onClick={next} variant="primary">
              {step === 'reemplazo' ? 'Apagar y continuar' : 'Siguiente'}
            </Button>
          )}
        </>
      }
      back={{ href: `/routines/${routineId}`, label: 'Volver a la rutina' }}
      current={Math.min(stepIndex, steps.length - 1)}
      description={copy[step].description}
      info={isLast ? undefined : routine.data.nombre}
      steps={steps}
      title={copy[step].title}
    >
      {step === 'reemplazo' && summary ? (
        <StepReplace active={summary} keepsCardio={active.data?.cardio != null} routineName={routine.data.nombre} />
      ) : null}
      {step === 'fechas' ? <StepDates draft={current} errors={errors} onChange={update} /> : null}
      {step === 'modo' ? (
        <StepMode
          conCardio={current.conCardio}
          mode={current.modo}
          onCardio={(conCardio) => update({ conCardio })}
          onMode={(modo: ProgramMode) => update({ modo })}
        />
      ) : null}
      {step === 'datos' ? <StepData draft={current} errors={errors} onLift={updateLift} /> : null}
      {step === 'resumen' ? (
        <StepSummary draft={current} routineName={routine.data.nombre} willReplace={willReplace} />
      ) : null}
    </ActivationFrame>
  );
}
