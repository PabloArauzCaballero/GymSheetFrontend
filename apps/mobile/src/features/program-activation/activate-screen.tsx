import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '@gymsheet/api-client';
import { confirm } from '@gymsheet/notifications';
import { programService, routineService } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { WizardActionBar } from '@/components/wizard/wizard-action-bar';
import { WizardProgress } from '@/components/wizard/wizard-progress';
import { DataStep } from '@/features/program-activation/step-data';
import { DatesStep } from '@/features/program-activation/step-dates';
import { ModeStep } from '@/features/program-activation/step-mode';
import { ReplaceStep } from '@/features/program-activation/step-replace';
import { SummaryStep } from '@/features/program-activation/step-summary';
import { useActivation, type ActivationStep } from '@/features/program-activation/use-activation';
import { useActivePrograms } from '@/features/programs/use-active-programs';
import { notify } from '@/notifications';
import { spacing } from '@/theme';
import { View } from 'react-native';

const TITLES: Record<ActivationStep, string> = {
  replace: 'Reemplazo',
  dates: 'Fechas',
  mode: 'Modo',
  data: 'Datos del modo',
  summary: 'Resumen',
};

function ActivateFlow({ routineId }: { routineId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const routine = useQuery({ queryKey: ['routine', routineId], queryFn: () => routineService.get(routineId) });
  const programs = useActivePrograms();

  if (routine.isPending || programs.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={120} />
        <Skeleton height={200} />
      </ScrollScreen>
    );
  }
  if (routine.isError || programs.isError || !routine.data || !programs.data) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={routine.error ?? programs.error} onRetry={() => { void routine.refetch(); void programs.refetch(); }} />
      </ScrollScreen>
    );
  }
  return (
    <ActivateBody
      onDone={(withCardio) => {
        void queryClient.invalidateQueries({ queryKey: ['programs'] });
        void queryClient.invalidateQueries({ queryKey: ['routines'] });
        router.replace(withCardio ? '/routines/cardio/new' : '/routines');
      }}
      programs={programs.data}
      routine={routine.data}
    />
  );
}

function ActivateBody({
  routine,
  programs,
  onDone,
}: {
  routine: NonNullable<ReturnType<typeof useQuery<Awaited<ReturnType<typeof routineService.get>>>>['data']>;
  programs: NonNullable<ReturnType<typeof useActivePrograms>['data']>;
  onDone: (withCardio: boolean) => void;
}) {
  const router = useRouter();
  const active = programs.fuerza;
  const state = useActivation(routine, active !== null);

  const activate = useMutation({
    mutationFn: (replace: boolean) => programService.activateStrength({ ...state.body, ...(replace ? { replace: true } : {}) }),
    onSuccess: () => {
      notify.success('Programa activado.');
      onDone(state.withCardio);
    },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.code === 'PROGRAM_ACTIVE_CONFLICT') {
        const choice = await confirm({
          title: '¿Apagar el programa actual?',
          message: 'Ya tienes un programa de pesas activo. Para activar este hay que apagarlo.',
          confirmLabel: 'Apagar y activar',
          cancelLabel: 'Cancelar',
        });
        if (choice.confirmed) activate.mutate(true);
        return;
      }
      notify.error(error);
    },
  });

  const order: ActivationStep[] = [
    ...(active ? (['replace'] as const) : []),
    'dates',
    'mode',
    ...(state.mode === 'NONE' ? [] : (['data'] as const)),
    'summary',
  ];
  const index = Math.max(0, order.indexOf(state.step));
  const steps = order.map((id) => ({ id, titulo: TITLES[id] }));

  const primary = (() => {
    if (state.step === 'summary') {
      return { label: 'Activar', loading: activate.isPending, onPress: () => activate.mutate(state.replace) };
    }
    if (state.step === 'dates') return { label: 'Siguiente', disabled: state.days.length === 0, onPress: state.next };
    if (state.step === 'data') return { label: 'Siguiente', disabled: !state.canContinueData, onPress: state.next };
    return { label: 'Siguiente', onPress: state.next };
  })();

  return (
    <ScrollScreen overlay={state.step === 'replace' ? undefined : (
      <WizardActionBar
        primary={primary}
        secondary={{ label: 'Volver', onPress: () => { if (!state.back()) router.back(); } }}
      />
    )}>
      <BackLink />
      <View style={{ gap: spacing.lg }}>
        <WizardProgress actual={index} onIr={(i) => { const id = order[i]; if (id) state.setStep(id); }} pasos={steps} />
        <ScreenHeader detail subtitle={routine.nombre} title="Activar rutina" />
      </View>
      {state.step === 'replace' && active ? (
        <ReplaceStep
          active={active}
          hasCardio={programs.cardio !== null}
          onCancel={() => router.back()}
          onReplace={() => { state.setReplace(true); state.next(); }}
          routineName={routine.nombre}
        />
      ) : null}
      {state.step === 'dates' ? <DatesStep state={state} /> : null}
      {state.step === 'mode' ? (
        <ModeStep mode={state.mode} onCardio={state.setWithCardio} onMode={state.setMode} withCardio={state.withCardio} />
      ) : null}
      {state.step === 'data' ? <DataStep mode={state.mode} state={state} /> : null}
      {state.step === 'summary' ? <SummaryStep routine={routine} state={state} /> : null}
      <View style={{ height: 112 }} />
    </ScrollScreen>
  );
}

export function ActivateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ActivateFlow routineId={id} />;
}
