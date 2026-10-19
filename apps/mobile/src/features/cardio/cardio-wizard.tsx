import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from 'react-native-reanimated';
import { buildCardioPlan, defaultCardioForm, validateCardio, type CardioForm } from '@gymsheet/hooks';
import { ApiError } from '@gymsheet/api-client';
import { confirm } from '@gymsheet/notifications';
import { programService } from '@/api/services';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { StepProgress, type FlowStep } from '@/components/step-flow';
import { Button } from '@/components/ui';
import { DaysPhase, IntensityPhase, MinutesPhase, ModalityPhase, ProgressionPhase, SummaryPhase } from '@/features/cardio/cardio-phases';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { notify } from '@/notifications';
import { spacing } from '@/theme';

const STEPS: readonly FlowStep[] = [
  { label: 'Cardio', icon: 'walk' },
  { label: 'Días', icon: 'calendar' },
  { label: 'Tiempo', icon: 'timer' },
  { label: 'Esfuerzo', icon: 'speedometer' },
  { label: 'Subida', icon: 'trending-up' },
  { label: 'Listo', icon: 'checkmark-circle' },
];
const PHASES = [ModalityPhase, DaysPhase, MinutesPhase, IntensityPhase, ProgressionPhase, SummaryPhase];
/** Campos que valida cada fase antes de dejar avanzar. */
const PHASE_FIELDS: readonly (readonly ('dias' | 'minutos' | 'fcReposo' | 'fcMax')[])[] = [[], ['dias'], ['minutos'], ['fcReposo', 'fcMax'], [], []];

/**
 * Asistente de cardio por fases (RF-17): modalidad → días → minutos → intensidad (zonas de pulso
 * con Karvonen, o sensación 1–10) → progresión. Crea el plan y lo activa en el carril de cardio,
 * que convive con el de pesas.
 */
export function CardioWizardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CardioForm>({ ...defaultCardioForm, dias: [1, 3, 5] });
  const [phase, setPhase] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showErrors, setShowErrors] = useState(false);
  const reduceMotion = useReduceMotion();
  const errors = validateCardio(form);
  const set = (patch: Partial<CardioForm>) => setForm((current) => ({ ...current, ...patch }));

  const activate = useMutation({
    mutationFn: (replace: boolean) =>
      programService.activateCardio({ cardioPlan: buildCardioPlan(form), duracionSemanas: 4, ...(replace ? { replace: true } : {}) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] });
      notify.success('Plan de cardio activado.');
      router.replace('/routines');
    },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.code === 'PROGRAM_ACTIVE_CONFLICT') {
        const choice = await confirm({
          title: '¿Reemplazar tu plan de cardio?',
          message: 'Ya tienes un plan de cardio activo. Tus pesas no se tocan.',
          confirmLabel: 'Reemplazar',
          cancelLabel: 'Cancelar',
        });
        if (choice.confirmed) activate.mutate(true);
        return;
      }
      notify.error(error);
    },
  });

  const Phase = PHASES[phase] ?? SummaryPhase;
  const last = phase === STEPS.length - 1;
  const go = (to: number) => {
    setDirection(to > phase ? 1 : -1);
    setShowErrors(false);
    setPhase(to);
  };
  const next = () => {
    if ((PHASE_FIELDS[phase] ?? []).some((field) => errors[field])) {
      setShowErrors(true);
      return;
    }
    go(phase + 1);
  };
  const enter = reduceMotion ? FadeIn.duration(0) : direction === 1 ? SlideInRight.duration(260) : SlideInLeft.duration(260);
  const exit = reduceMotion ? undefined : direction === 1 ? SlideOutLeft.duration(200) : SlideOutRight.duration(200);

  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader detail subtitle={`Paso ${phase + 1} de ${STEPS.length}`} title="Plan de cardio" />
      <StepProgress current={phase} steps={STEPS} />
      <Animated.View entering={enter} exiting={exit} key={phase}>
        <Phase errors={errors} form={form} set={set} showErrors={showErrors} />
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {phase > 0 ? <Button icon="arrow-back" label="Atrás" onPress={() => go(phase - 1)} style={{ flex: 1 }} variant="ghost" /> : null}
        {last ? (
          <Button
            icon="checkmark"
            label="Activar plan de cardio"
            loading={activate.isPending}
            onPress={() => {
              setShowErrors(true);
              if (Object.keys(errors).length === 0) activate.mutate(false);
            }}
            style={{ flex: 2 }}
          />
        ) : (
          <Button icon="arrow-forward" label="Siguiente" onPress={next} style={{ flex: 2 }} />
        )}
      </View>
    </ScrollScreen>
  );
}
