import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import {
  WEEKDAY_NAMES,
  WIZARD_STEPS,
  countLabel,
  createDraftExercise,
  findDay,
  type DayTarget,
  type Weekday,
} from '@gymsheet/hooks';
import { ScreenHeader } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { WizardActionBar } from '@/components/wizard/wizard-action-bar';
import { WizardProgress } from '@/components/wizard/wizard-progress';
import { ExerciseBrowser } from '@/features/exercise-browser/exercise-browser';
import type { PickConfig } from '@/features/exercise-browser/types';
import { useRoutineDraft } from '@/features/routine-wizard/use-wizard';
import { goToWizardStep, orderPath, pickDetailPath, wizardStepPath } from '@/lib/wizard-routes';
import { spacing } from '@/theme';

const DAYS_STEP = 4;

/** Nombres de los días del grupo: «Lunes y jueves», «Lunes, miércoles y viernes». */
function listDays(days: readonly Weekday[]): string {
  const names = days.map((dia, index) =>
    index === 0 ? WEEKDAY_NAMES[dia] : WEEKDAY_NAMES[dia].toLowerCase(),
  );
  return names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * Ejercicios de un día, a pantalla completa (nunca un modal): el buscador de
 * siempre en modo selector, con «+» por fila, la ficha al tocar la fila y la
 * barra inferior «N ejercicios · Ver y ordenar · Listo».
 *
 * `dia` es un día de la semana o `grupo` («Configurar juntos»: lo elegido se
 * copia a todos los días marcados al pulsar Listo).
 */
export function DayPickScreen({ dia }: { dia: DayTarget }) {
  const { state, draft, dispatch } = useRoutineDraft();
  const day = dia === 'grupo' ? undefined : findDay(draft, dia);
  const list = dia === 'grupo' ? state.grupo?.ejercicios : day?.ejercicios;

  const pick = useMemo<PickConfig>(
    () => ({
      isAdded: (id) => list?.some((exercise) => exercise.ejercicioId === id) ?? false,
      add: (exercise) =>
        dispatch({
          type: 'agregarEjercicio',
          destino: dia,
          ejercicio: createDraftExercise(exercise, draft.objetivo),
        }),
      remove: (id) => dispatch({ type: 'quitarEjercicio', destino: dia, ejercicioId: id }),
      onOpen: (id) => router.push(pickDetailPath(id, dia)),
    }),
    [dia, dispatch, draft.objetivo, list],
  );

  if (!list) return <Redirect href={wizardStepPath(DAYS_STEP)} />;

  const title =
    dia === 'grupo'
      ? 'Configurar juntos'
      : [WEEKDAY_NAMES[dia], day?.nombre.trim()].filter(Boolean).join(' · ');
  const scope = dia === 'grupo' && state.grupo ? listDays(state.grupo.dias) : undefined;

  const finish = () => {
    if (dia === 'grupo') {
      dispatch({ type: 'confirmarGrupo' });
      goToWizardStep(DAYS_STEP);
      return;
    }
    router.back();
  };

  return (
    <ExerciseBrowser
      header={(subtitle) => (
        <>
          <BackLink />
          <View style={{ gap: spacing.lg }}>
            <WizardProgress actual={DAYS_STEP} onIr={goToWizardStep} pasos={WIZARD_STEPS} />
            <ScreenHeader
              detail
              subtitle={scope ? `${scope}. ${subtitle}` : subtitle}
              title={title}
            />
          </View>
        </>
      )}
      mode="pick"
      overlay={
        <WizardActionBar
          info={countLabel(list.length)}
          primary={{ label: 'Listo', onPress: finish }}
          secondary={{
            label: 'Ver y ordenar',
            disabled: list.length === 0,
            onPress: () => router.push(orderPath(dia)),
          }}
        />
      }
      pick={pick}
    />
  );
}
