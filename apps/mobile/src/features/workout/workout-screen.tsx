import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { previousPerformance, topSet } from '@gymsheet/domain';
import { transitionLabel } from '@gymsheet/hooks';
import type { WorkoutExercise, WorkoutSetInput } from '@gymsheet/types';
import { useExerciseMedia } from '@/api/use-exercise-media';
import { ExercisePicker } from '@/components/exercise-picker';
import { prescriptionLabel } from '@/components/exercise-row';
import { ErrorState, RowsSkeleton, Skeleton } from '@/components/feedback';
import { GroupBlock } from '@/components/group-block';
import { Badge, ScrollScreen } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { StickyFooter, STICKY_FOOTER_SPACE } from '@/components/sticky-footer';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { CardioLogger } from '@/features/cardio/cardio-logger';
import { SuggestedLoad, useNextLoads } from '@/features/programs/suggested-load';
import { CollapsedExercise, CurrentExercise, setLabel } from '@/features/workout/exercise-card';
import { ExerciseStrip } from '@/features/workout/exercise-strip';
import { REST_BAR_HEIGHT, RestBar } from '@/features/workout/rest-bar';
import { EMPTY_DRAFT, SetInputs, parseDraft, type SetDraft } from '@/features/workout/set-inputs';
import { countSets, useWorkoutSession, volumeOf } from '@/features/workout/use-workout-session';
import {
  buildFlowBlocks,
  currentStep,
  isItemDone,
  previousRestSeconds,
  progressLabel,
  restAfterLogging,
  roundLabel,
  stepFrom,
  stepOf,
  upcomingItems,
  withLoggedSet,
  type FlowBlock,
  type FlowItem,
  type FlowStep,
} from '@/features/workout/workout-flow';
import { useWorkoutStore } from '@/features/workout/workout-store';
import { WORKOUT_LABEL, WORKOUT_TONE, formatDuration, relativeDay } from '@/lib/format';
import { captureStreakLocation } from '@/lib/streak-location';
import { routes } from '@/lib/routes';
import { confirm, notify } from '@/notifications';
import { useAmbientStore } from '@/state/ambient-store';
import { minTouchTarget, spacing } from '@/theme';

type Item = FlowItem & { source: WorkoutExercise };

function nameOf(item: WorkoutExercise): string {
  return item.ejercicio?.nombreEs?.trim() || item.ejercicio?.nombre || 'Ejercicio no disponible';
}

function strengthSets(item: WorkoutExercise) {
  return item.series.filter((set) => set.tipoSerie !== 'CARDIO');
}

/** «3 × 8–12 · 60 kg · RIR 2» del objetivo copiado de la rutina; `null` si se añadió a mano. */
function targetOf(item: WorkoutExercise): string | null {
  if (item.seriesObjetivo === null) return null;
  return prescriptionLabel({
    series: item.seriesObjetivo,
    repsMin: item.repsMin,
    repsMax: item.repsMax,
    duracionSeg: item.duracionSeg,
    pesoKg: item.pesoObjetivoKg,
    rir: item.rirObjetivo,
  });
}

function blockName(block: FlowBlock<Item>): string {
  return `${block.kind === 'circuito' ? 'Circuito' : 'Superserie'} ${block.label ?? ''}`.trim();
}

/** Posición «A1», «A2» de un ejercicio en su bloque. */
function badgeOf(block: FlowBlock<Item>, item: Item): string | null {
  if (block.kind === 'single' || !block.label) return null;
  return `${block.label}${block.items.indexOf(item) + 1}`;
}

/** La vuelta en que va un bloque: la del paso actual si está en él, o la siguiente pendiente. */
function blockRound(block: FlowBlock<Item>, step: FlowStep | null): number {
  if (step && block.items.some((item) => item.id === step.itemId)) return step.round;
  const pending = block.items.filter((item) => !isItemDone(item));
  if (pending.length === 0) return block.rounds ?? 1;
  return Math.min(...pending.map((item) => item.logged)) + 1;
}

/** «Remo con mancuerna · vuelta 2/3» o «Press banca · serie 3». */
function stepLabel(blocks: ReadonlyArray<FlowBlock<Item>>, step: FlowStep): string {
  const block = blocks[step.blockIndex];
  const item = block?.items.find((candidate) => candidate.id === step.itemId);
  if (!block || !item) return '';
  const name = nameOf(item.source);
  if (block.kind === 'single') return `${name} · serie ${step.round}`;
  return `${name} · ${roundLabel(step.round, block.rounds).toLowerCase()}`;
}

/**
 * Entrenamiento guiado (C3.e, C8.3.3). Arriba, «Siguiente: …» con la tira de
 * miniaturas; solo el ejercicio actual va desplegado (objetivo, series de hoy,
 * «Última vez» que rellena y los campos), los demás contraídos con su
 * progreso; las superseries se agrupan como en el Día y pasan solas de A1 a
 * A2 con «Vuelta 2/3». Un único botón en acento, «Registrar serie», fijo
 * abajo; encima, la mini-barra del descanso con el descanso **del plan**.
 */
export function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useWorkoutSession(id);
  const { workout, account, history } = session;
  const loads = useNextLoads();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SetDraft>(EMPTY_DRAFT);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const startRest = useWorkoutStore((state) => state.startRest);
  const setActive = useWorkoutStore((state) => state.setActive);
  const endSession = useWorkoutStore((state) => state.endSession);

  const data = workout.data;
  const ordered = useMemo(() => (data ? [...data.ejercicios].sort((a, b) => a.orden - b.orden) : []), [data]);
  // Los medios de la sesión pueden venir vacíos: solo se piden los que faltan.
  const withMedia = useExerciseMedia(ordered.map((item) => item.ejercicio));
  const blocks = useMemo(
    () =>
      buildFlowBlocks<Item>(
        ordered.map((item) => ({
          id: item.id,
          grupo: item.grupo,
          grupoTipo: item.grupoTipo,
          target: item.seriesObjetivo,
          logged: item.ejercicio?.category === 'cardio' ? item.series.length : strengthSets(item).length,
          descansoSeg: item.descansoSeg,
          descansoEntreSeg: item.descansoEntreSeg,
          source: item,
        })),
      ),
    [ordered],
  );
  const step = (focusId ? stepOf(blocks, focusId) : null) ?? currentStep(blocks);
  const current = step ? (ordered.find((item) => item.id === step.itemId) ?? null) : null;
  const upcoming = upcomingItems(blocks, step, 1)[0];
  const upcomingStep = upcoming ? stepOf(blocks, upcoming.id) : null;
  const live = data?.estado === 'EN_PROGRESO';

  const reference = current?.ejercicio
    ? previousPerformance(history.data?.items ?? [], current.ejercicio.id, id)
    : null;
  const previousTop = reference ? topSet(reference.exercise) : null;
  const suggested = loads?.items.find((entry) => entry.ejercicioId === current?.ejercicio?.id);

  // El borrador de la serie se rellena al cambiar de ejercicio: la última serie
  // de hoy, si no la carga sugerida, si no la última vez, si no el objetivo.
  useEffect(() => {
    if (!current || draftFor === current.id) return;
    const last = [...strengthSets(current)].sort((a, b) => b.numeroSerie - a.numeroSerie)[0];
    const weight = last?.pesoKg ?? (suggested?.pesoSugeridoKg || null) ?? previousTop?.pesoKg ?? current.pesoObjetivoKg;
    const reps = last?.repeticiones ?? previousTop?.repeticiones ?? current.repsMax ?? current.repsMin;
    const rir = last?.rir ?? current.rirObjetivo;
    setDraft({
      pesoKg: weight != null ? String(weight) : '',
      repeticiones: reps != null ? String(reps) : '',
      rir: rir != null ? String(rir) : '',
    });
    setDraftFor(current.id);
  }, [current, draftFor, previousTop, suggested]);

  // El fondo se anima mientras hay sesión abierta y se calma al cerrarla.
  const setAmbient = useAmbientStore((state) => state.setIntensity);
  useEffect(() => {
    setAmbient(live ? 'active' : 'calm');
    return () => setAmbient('calm');
  }, [live, setAmbient]);

  // La mini-barra de las pestañas sabe qué sesión hay abierta y qué toca.
  const currentName = current ? nameOf(current) : null;
  const currentProgress = current && step ? progressLabel(blocks[step.blockIndex]?.items.find((i) => i.id === current.id) ?? { logged: 0, target: null }) : null;
  useEffect(() => {
    if (!data) return;
    if (data.estado === 'EN_PROGRESO') setActive({ id: data.id, current: currentName, progress: currentProgress });
    else endSession(data.id);
  }, [data, currentName, currentProgress, setActive, endSession]);

  if (workout.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={56} />
        <Skeleton height={220} />
        <RowsSkeleton rows={3} thumb={48} />
      </ScrollScreen>
    );
  }
  if (workout.isError || !data) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={workout.error} onRetry={() => void workout.refetch()} />
      </ScrollScreen>
    );
  }

  const totalSets = countSets(data);
  const volume = Math.round(volumeOf(data));
  const duration = formatDuration(data.fechaInicio, data.fechaFin);
  const isCardio = current?.ejercicio?.category === 'cardio';

  const logSet = () => {
    if (!current || !step) return;
    const parsed = parseDraft(draft);
    if (!parsed) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      notify.info('Escribe cuántas repeticiones hiciste.');
      return;
    }
    const numeroSerie = Math.max(0, ...current.series.map((set) => set.numeroSerie)) + 1;
    const set: WorkoutSetInput = {
      numeroSerie,
      ...parsed,
      // El descanso real: desde la última serie registrada en la sesión.
      descansoSegAnterior: previousRestSeconds(ordered.flatMap((item) => item.series.map((s) => s.fechaRegistro))),
    };
    const after = withLoggedSet(blocks, current.id);
    const blockIndex = step.blockIndex;
    const loggedId = current.id;
    session.addSet.mutate(
      { sessionExerciseId: loggedId, set },
      {
        onSuccess: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const next = stepFrom(after, blockIndex);
          setFocusId(next?.itemId ?? null);
          const rest = restAfterLogging(after, loggedId);
          startRest(id, rest.seconds, next ? stepLabel(after, next) : null);
          AccessibilityInfo.announceForAccessibility(
            `Serie ${numeroSerie} registrada.${next ? ` Siguiente: ${stepLabel(after, next)}.` : ''}`,
          );
        },
      },
    );
  };

  const onFinish = async () => {
    const result = await confirm({
      title: 'Finalizar sesión',
      message: `Se cerrará la sesión con ${totalSets} ${totalSets === 1 ? 'serie' : 'series'} registradas.`,
      confirmLabel: 'Finalizar',
      cancelLabel: 'Seguir entrenando',
    });
    if (!result.confirmed) return;
    // El permiso de ubicación se pide después de confirmar, no antes.
    const location = await captureStreakLocation();
    session.finish.mutate(location ?? undefined);
  };

  const onCancel = async () => {
    const result = await confirm({
      title: 'Cancelar sesión',
      message: 'Se descartará la sesión en curso. Esta acción no se puede deshacer.',
      severity: 'danger',
      confirmLabel: 'Cancelar sesión',
      cancelLabel: 'Volver',
    });
    if (result.confirmed) session.cancel.mutate();
  };

  const undoLast = (item: WorkoutExercise) => {
    const last = [...item.series].sort((a, b) => b.numeroSerie - a.numeroSerie)[0];
    if (last) session.removeSet.mutate(last.id);
  };

  const renderItem = (block: FlowBlock<Item>, item: Item) => {
    const source = item.source;
    const exercise = withMedia(source.ejercicio);
    const grouped = block.kind !== 'single';
    const badge = badgeOf(block, item);
    const best = topSet(source);
    const expanded = !live || item.id === current?.id;
    if (!expanded) {
      return (
        <CollapsedExercise
          badge={badge}
          best={best ? setLabel({ tipoSerie: 'FUERZA', pesoKg: best.pesoKg, repeticiones: best.repeticiones, duracionSeg: null, distanciaM: null }) : null}
          done={isItemDone(item)}
          exercise={exercise}
          grouped={grouped}
          key={item.id}
          name={nameOf(source)}
          onPress={() => setFocusId(item.id)}
          progress={progressLabel(item)}
          testID={`workout-exercise-${item.id}`}
        />
      );
    }
    return (
      <CurrentExercise
        badge={badge}
        exercise={exercise}
        grouped={grouped}
        key={item.id}
        name={nameOf(source)}
        note={source.nota}
        onOpenDetail={source.ejercicio ? () => router.push(routes.exercise(source.ejercicio!.id)) : undefined}
        progress={progressLabel(item)}
        sets={source.series}
        target={targetOf(source)}
        footer={
          live && source.series.length > 0 ? (
            <PressableScale
              accessibilityLabel="Deshacer la última serie"
              disabled={session.removeSet.isPending}
              haptic="none"
              onPress={() => undoLast(source)}
              style={{ minHeight: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
              testID="undo-set"
            >
              <Text strong tone="danger" variant="subhead">
                Deshacer última serie
              </Text>
            </PressableScale>
          ) : null
        }
        testID={live ? 'workout-current' : `workout-exercise-${item.id}`}
      >
        {live ? (
          <>
            <SuggestedLoad exerciseId={source.ejercicio?.id} loads={loads} />
            {source.ejercicio?.category === 'cardio' ? (
              <CardioLogger
                onSubmit={(set) => session.addCardioSet.mutate({ sessionExerciseId: source.id, set })}
                pending={session.addCardioSet.isPending}
                setNumber={source.series.length + 1}
              />
            ) : (
              <SetInputs
                lastTime={
                  previousTop && reference
                    ? { ...previousTop, when: relativeDay(reference.workout.fechaInicio).toLowerCase() }
                    : null
                }
                onChange={setDraft}
                value={draft}
                weightIncrementKg={account.data?.pesoIncrementoKg}
              />
            )}
          </>
        ) : null}
      </CurrentExercise>
    );
  };

  const footerAction = !live ? null : current && !isCardio ? (
    <Button
      haptic="none"
      icon="checkmark"
      label="Registrar serie"
      loading={session.addSet.isPending}
      onPress={logSet}
      size="lg"
      style={{ flex: 1 }}
      testID="log-set"
    />
  ) : !current ? (
    <Button
      label="Finalizar sesión"
      loading={session.finish.isPending}
      onPress={() => void onFinish()}
      size="lg"
      style={{ flex: 1 }}
      testID="finish-primary"
    />
  ) : null;

  return (
    <ScrollScreen
      onRefresh={() => void workout.refetch()}
      overlay={
        live ? (
          <View style={{ gap: spacing.sm }}>
            <RestBar />
            {footerAction ? <StickyFooter>{footerAction}</StickyFooter> : null}
          </View>
        ) : null
      }
      refreshing={workout.isRefetching}
    >
      <BackLink />
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }} variant="display">
            {relativeDay(data.fechaInicio)}
          </Text>
          <Badge label={WORKOUT_LABEL[data.estado]} tone={WORKOUT_TONE[data.estado]} />
        </View>
        <Text tabular tone="secondary" variant="subhead">
          {[
            `${ordered.length} ${ordered.length === 1 ? 'ejercicio' : 'ejercicios'}`,
            `${totalSets} ${totalSets === 1 ? 'serie' : 'series'}`,
            volume > 0 ? `${volume.toLocaleString('es-ES')} kg` : null,
            duration,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      {live ? (
        <ExerciseStrip
          currentId={current?.id ?? null}
          items={ordered.map((item) => ({
            id: item.id,
            name: nameOf(item),
            exercise: withMedia(item.ejercicio),
            done: blocks.some((block) => block.items.some((i) => i.id === item.id && isItemDone(i))),
          }))}
          next={upcoming && upcomingStep ? stepLabel(blocks, upcomingStep) : null}
          onSelect={setFocusId}
        />
      ) : null}

      {data.observacion ? (
        <Text tone="secondary" variant="subhead">
          {data.observacion}
        </Text>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {blocks.map((block) => {
          const key = block.items.map((item) => item.id).join('+');
          if (block.kind === 'single') {
            const item = block.items[0];
            return item ? renderItem(block, item) : null;
          }
          return (
            <GroupBlock
              key={key}
              label={blockName(block)}
              restSeconds={block.restAfter}
              rounds={block.rounds ?? 1}
              status={live ? roundLabel(blockRound(block, step), block.rounds) : undefined}
              testID={`workout-block-${block.label}`}
              transition={transitionLabel(block.between)}
            >
              {block.items.map((item) => renderItem(block, item))}
            </GroupBlock>
          );
        })}
      </View>

      {live ? (
        <View style={{ gap: spacing.sm }}>
          <Button icon="add" label="Añadir ejercicio" onPress={() => setPickerOpen(true)} variant="ghost" />
          <Button label="Finalizar sesión" loading={session.finish.isPending} onPress={() => void onFinish()} variant="secondary" />
          <Button label="Cancelar sesión" loading={session.cancel.isPending} onPress={() => void onCancel()} variant="ghost" />
        </View>
      ) : null}

      {/* Reserva el hueco de la mini-barra y del botón fijo: nada queda tapado. */}
      {live ? <View style={{ height: REST_BAR_HEIGHT + spacing.sm + STICKY_FOOTER_SPACE }} /> : null}

      <ExercisePicker
        onClose={() => setPickerOpen(false)}
        onSelect={(exerciseId) => session.addExercise.mutate(exerciseId, { onSuccess: () => setPickerOpen(false) })}
        pending={session.addExercise.isPending}
        visible={pickerOpen}
      />
    </ScrollScreen>
  );
}

