import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isTimedSet, longestTimedSet, previousPerformance, topSet } from '@gymsheet/domain';
import { secondsLabel } from '@gymsheet/hooks';
import type { TimedWorkoutSetInput, Workout, WorkoutExercise, WorkoutSetInput } from '@gymsheet/types';
import { useExerciseMedia } from '@/api/use-exercise-media';
import { ExercisePicker } from '@/components/exercise-picker';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { CardioLogger } from '@/features/cardio/cardio-logger';
import { SuggestedLoad, useNextLoads } from '@/features/programs/suggested-load';
import { FinishPage } from '@/features/workout/focus/finish-page';
import { FocusHeader } from '@/features/workout/focus/focus-header';
import { FocusPage, GroupSwitch, PageMedia, SetTrack } from '@/features/workout/focus/focus-page';
import { RestOverlay } from '@/features/workout/focus/rest-overlay';
import { SessionSheet, type OverviewItem, type SessionSheetMode } from '@/features/workout/focus/session-menu';
import { RirPicker, Stepper } from '@/features/workout/focus/stepper';
import { parseDraft, parseTimedDraft, type SetDraft } from '@/features/workout/set-inputs';
import {
  badgeOf,
  blockName,
  isCardio,
  isTimed,
  nameOf,
  stepLabel,
  strengthSets,
  targetOf,
  toFlowItems,
  type Item,
} from '@/features/workout/shared';
import { TimedSetInputs } from '@/features/workout/timed-set-inputs';
import { countSets, volumeOf, type useWorkoutSession } from '@/features/workout/use-workout-session';
import {
  activeItemOf,
  blockFill,
  buildFlowBlocks,
  currentStep,
  isBlockDone,
  isItemDone,
  isStaleSession,
  kgLabel,
  openingWeight,
  pageAfterLogging,
  previousRestSeconds,
  progressLabel,
  restAfterLogging,
  roundLabel,
  sessionTitle,
  stepFrom,
  withLoggedSet,
} from '@/features/workout/workout-flow';
import { useWorkoutStore } from '@/features/workout/workout-store';
import { relativeDay } from '@/lib/format';
import { routes } from '@/lib/routes';
import { captureStreakLocation } from '@/lib/streak-location';
import { confirm, notify } from '@/notifications';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { useAmbientStore } from '@/state/ambient-store';
import { colors, footerFade, gutter, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/** Alto del botón fijo. */
const FOOTER_BUTTON = 56;
/** Lo que tarda en cerrarse una hoja antes de poder abrir otra cosa encima (iOS no apila dos modales). */
const SHEET_CLOSE_MS = 360;

type Session = ReturnType<typeof useWorkoutSession>;

function bump(text: string, delta: number, min: number): string {
  const current = Number(text.replace(',', '.'));
  const base = Number.isFinite(current) ? current : 0;
  // Coma decimal: «62,5», como se escribe aquí (el análisis acepta coma y punto).
  return String(Math.max(min, Math.round((base + delta) * 100) / 100)).replace('.', ',');
}

/** ¿El ejercicio se hace con carga? Sin material declarado o con el propio cuerpo, no se exige peso. */
function needsLoad(source: WorkoutExercise): boolean {
  const equipment = source.ejercicio?.requiredEquipment?.trim().toLowerCase() ?? '';
  return equipment !== '' && !/body|corporal|ningun|none/u.test(equipment);
}

/**
 * Sesión abierta desde hace horas: en vez de un cronómetro de dos días y una
 * pantalla que dice «Hace 2 días», se pregunta qué hacer con ella.
 */
function StaleGate({
  startIso,
  sets,
  topInset,
  bottomInset,
  onResume,
  onFinish,
  onCancel,
  onBack,
  busy,
}: {
  startIso: string;
  sets: number;
  topInset: number;
  bottomInset: number;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  const when = relativeDay(startIso).toLowerCase();
  return (
    <View style={{ flex: 1, paddingTop: topInset + spacing.sm, paddingBottom: bottomInset + spacing.lg, paddingHorizontal: gutter }} testID="workout-stale">
      <PressableScale
        accessibilityLabel="Volver"
        haptic="none"
        onPress={onBack}
        scaleTo={0.9}
        style={{
          width: minTouchTarget,
          height: minTouchTarget,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceHigh,
        }}
      >
        <Ionicons color={colors.text} name="chevron-back" size={iconSizes.md + 2} />
      </PressableScale>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md }}>
        <Text accessibilityRole="header" variant="display">
          Tienes un entreno sin cerrar
        </Text>
        <Text tone="secondary" variant="body">
          {sets > 0
            ? `Lo empezaste ${when} y registraste ${sets} ${sets === 1 ? 'serie' : 'series'}. Puedes seguir donde lo dejaste o guardarlo como está.`
            : `Lo empezaste ${when} y no llegaste a registrar nada. Puedes retomarlo ahora o descartarlo.`}
        </Text>
      </View>
      <View style={{ gap: spacing.smd }}>
        <Button label="Seguir entrenando" onPress={onResume} size="lg" testID="stale-resume" />
        {sets > 0 ? <Button disabled={busy} label="Finalizar y guardar" onPress={onFinish} size="lg" testID="stale-finish" variant="secondary" /> : null}
        <Button disabled={busy} label="Descartar sesión" onPress={onCancel} size="lg" testID="stale-cancel" variant="ghost" />
      </View>
    </View>
  );
}

/**
 * Entrenamiento en modo enfoque. Un ejercicio (o una superserie) por página, a
 * pantalla completa, y se avanza deslizando; arriba, un tramo por ejercicio
 * como en las historias. Una sola acción abajo, «Registrar serie». El descanso
 * entra a pantalla completa y bloquea lo demás hasta que termina o se salta.
 * Añadir, finalizar y cancelar viven en ⋯. La última página es el cierre.
 */
export function WorkoutFocus({ id, data, session }: { id: string; data: Workout; session: Session }) {
  useKeepAwake();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const { account, history } = session;
  const loads = useNextLoads();

  const startRest = useWorkoutStore((state) => state.startRest);
  const skipRest = useWorkoutStore((state) => state.skipRest);
  const restKind = useWorkoutStore((state) => state.restKind);
  const setActive = useWorkoutStore((state) => state.setActive);

  const ordered = useMemo(() => [...data.ejercicios].sort((a, b) => a.orden - b.orden), [data]);
  const withMedia = useExerciseMedia(ordered.map((item) => item.ejercicio));
  const blocks = useMemo(() => buildFlowBlocks<Item>(toFlowItems(ordered)), [ordered]);
  const finishPage = blocks.length;

  const [page, setPage] = useState(() => currentStep(blocks)?.blockIndex ?? finishPage);
  const [initialPage] = useState(page);
  const [chosen, setChosen] = useState<Record<number, string>>({});
  const [extra, setExtra] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [sheet, setSheet] = useState<SessionSheetMode>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resumed, setResumed] = useState(false);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(initialPage * width);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const goTo = (index: number) => {
    const target = Math.max(0, Math.min(finishPage, index));
    scrollRef.current?.scrollTo({ x: target * width, animated: !reduceMotion });
    setPage(target);
  };

  // El fondo se anima mientras hay sesión abierta y se calma al cerrarla.
  const setAmbient = useAmbientStore((state) => state.setIntensity);
  useEffect(() => {
    setAmbient('active');
    return () => setAmbient('calm');
  }, [setAmbient]);

  const active = page < finishPage ? activeItemOf(blocks, page, chosen[page] ?? null) : null;
  const activeSource = active?.item.source ?? null;

  // La mini-barra de las pestañas sabe qué sesión hay abierta y qué toca.
  const activeName = activeSource ? nameOf(activeSource) : null;
  const activeProgress = active ? progressLabel(active.item) : null;
  useEffect(() => {
    setActive({ id: data.id, current: activeName, progress: activeProgress });
  }, [data.id, activeName, activeProgress, setActive]);

  const reference = (source: WorkoutExercise) =>
    source.ejercicio
      ? previousPerformance(history.data?.items ?? [], source.ejercicio.id, id, isTimed(source) ? isTimedSet : undefined)
      : null;

  /** Con qué abre la serie de un ejercicio: lo de hoy, lo sugerido, lo de la última vez o el objetivo. */
  const openingDraft = (source: WorkoutExercise): SetDraft => {
    const timed = isTimed(source);
    const previous = reference(source);
    const previousTop = previous && !timed ? topSet(previous.exercise) : null;
    const previousHold = previous && timed ? longestTimedSet(previous.exercise) : null;
    const suggested = loads?.items.find((entry) => entry.ejercicioId === source.ejercicio?.id);
    const last = [...strengthSets(source)].sort((a, b) => b.numeroSerie - a.numeroSerie)[0];
    const weight = openingWeight({
      today: last?.pesoKg,
      suggested: suggested?.pesoSugeridoKg,
      lastTime: previousTop?.pesoKg,
      target: source.pesoObjetivoKg,
    });
    const reps = last?.repeticiones ?? previousTop?.repeticiones ?? source.repsMax ?? source.repsMin;
    const rir = last?.rir ?? source.rirObjetivo;
    const seconds = last?.duracionSeg ?? previousHold ?? source.duracionSeg;
    return {
      pesoKg: weight != null ? kgLabel(weight) : '',
      repeticiones: reps != null ? String(reps) : '',
      rir: rir != null ? String(Math.min(4, rir)) : '',
      duracionSeg: seconds != null ? String(seconds) : '',
    };
  };
  const draftOf = (source: WorkoutExercise): SetDraft => drafts[source.id] ?? openingDraft(source);
  const setDraft = (source: WorkoutExercise, next: SetDraft) => setDrafts((all) => ({ ...all, [source.id]: next }));

  /** «60 kg × 7» de la serie que viene, para la tarjeta del descanso. */
  const previewOf = (source: WorkoutExercise): string | null => {
    if (isCardio(source)) return null;
    const draft = draftOf(source);
    if (isTimed(source)) {
      const seconds = Number(draft.duracionSeg);
      return Number.isFinite(seconds) && seconds > 0 ? secondsLabel(seconds) : null;
    }
    const weight = Number(draft.pesoKg.replace(',', '.'));
    const reps = Number(draft.repeticiones);
    if (!Number.isFinite(reps) || reps < 1) return null;
    return Number.isFinite(weight) && weight > 0 ? `${kgLabel(weight)} kg × ${reps}` : `${reps} reps`;
  };

  const totalSets = countSets(data);

  const logSet = () => {
    if (!active || !activeSource) return;
    const timed = isTimed(activeSource);
    const draft = draftOf(activeSource);
    const parsed = timed ? parseTimedDraft(draft) : parseDraft(draft);
    if (!parsed) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      notify.info(timed ? 'Escribe cuántos segundos aguantaste (de 1 a 3600).' : 'Pon cuántas repeticiones hiciste.');
      return;
    }
    // Un 0 escrito vale (sin carga); un campo vacío en un ejercicio con material es un olvido.
    if (!timed && draft.pesoKg.trim() === '' && needsLoad(activeSource)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      notify.info('Pon el peso que usaste (0 si fue sin carga).');
      return;
    }
    const numeroSerie = Math.max(0, ...activeSource.series.map((set) => set.numeroSerie)) + 1;
    const set: WorkoutSetInput | TimedWorkoutSetInput = {
      numeroSerie,
      ...parsed,
      // El descanso real: desde la última serie registrada en la sesión.
      descansoSegAnterior: previousRestSeconds(ordered.flatMap((item) => item.series.map((s) => s.fechaRegistro))),
    };
    const loggedId = activeSource.id;
    const blockIndex = active.step.blockIndex;
    const after = withLoggedSet(blocks, loggedId);
    const next = stepFrom(after, blockIndex);
    const rest = restAfterLogging(after, loggedId);
    const nextSource = next ? ordered.find((item) => item.id === next.itemId) : undefined;
    const nextLabel = next ? [stepLabel(after, next), nextSource ? previewOf(nextSource) : null].filter(Boolean).join(' · ') : null;

    // El descanso arranca con el toque, no cuando contesta el servidor: antes
    // tardaba lo que tardara la red y a veces parecía que no había empezado.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    startRest(id, rest.seconds, nextLabel, rest.kind);
    // El borrador se guarda: la serie siguiente abre con lo que se acaba de hacer.
    setDraft(activeSource, draft);

    session.addSet.mutate(
      { sessionExerciseId: loggedId, set },
      {
        onSuccess: () => {
          setExtra(null);
          setChosen((all) => Object.fromEntries(Object.entries(all).filter(([key]) => Number(key) !== blockIndex)));
          // Debajo del descanso la pantalla ya queda en lo que viene.
          const target = pageAfterLogging(after, next);
          if (target !== page) goTo(target);
          AccessibilityInfo.announceForAccessibility(`Serie ${numeroSerie} registrada.${nextLabel ? ` Siguiente: ${nextLabel}.` : ''}`);
        },
        // No se guardó: no hay descanso que hacer (el aviso del error ya salió).
        onError: () => skipRest(),
      },
    );
  };

  const undoLast = (source: WorkoutExercise) => {
    const last = [...source.series].sort((a, b) => b.numeroSerie - a.numeroSerie)[0];
    if (!last) return;
    // Deshacer una serie deshace también su descanso.
    skipRest();
    session.removeSet.mutate(last.id);
  };

  const onFinish = async () => {
    const result = await confirm({
      title: 'Finalizar sesión',
      message:
        totalSets > 0
          ? `Se guardará con ${totalSets} ${totalSets === 1 ? 'serie registrada' : 'series registradas'}.`
          : 'No has registrado ninguna serie. Se guardará vacía.',
      confirmLabel: 'Finalizar',
      cancelLabel: 'Seguir',
    });
    if (!result.confirmed) return;
    skipRest();
    // El permiso de ubicación se pide después de confirmar, no antes.
    const location = await captureStreakLocation();
    session.finish.mutate(location ?? undefined);
  };

  const onCancel = async () => {
    const result = await confirm({
      title: 'Cancelar sesión',
      message: 'Se descartará la sesión y lo que hayas registrado. No se puede deshacer.',
      severity: 'danger',
      confirmLabel: 'Cancelar sesión',
      cancelLabel: 'Volver',
    });
    if (result.confirmed) session.cancel.mutate();
  };

  const minimize = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // iOS no presenta un modal mientras otro se está cerrando: lo que se abra
  // justo después de cerrar la hoja espera a que termine de irse. Sin esto, un
  // toque rápido en ⋯ dejaba la hoja sin abrir.
  const sheetClosedAt = useRef(0);
  const closeSheet = () => {
    sheetClosedAt.current = Date.now();
    setSheet(null);
  };
  const afterSheet = (action: () => void) => {
    const wait = Math.max(0, SHEET_CLOSE_MS - (Date.now() - sheetClosedAt.current));
    if (wait === 0) action();
    else setTimeout(action, wait);
  };
  /** Cierra la hoja y, cuando ya no está, hace lo pedido. */
  const fromMenu = (action: () => void) => {
    closeSheet();
    afterSheet(action);
  };

  const closingBusy = session.finish.isPending || session.cancel.isPending;

  if (isStaleSession(data.fechaInicio) && !resumed) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StaleGate
          bottomInset={insets.bottom}
          busy={closingBusy}
          onBack={minimize}
          onCancel={() => void onCancel()}
          onFinish={() => void onFinish()}
          onResume={() => setResumed(true)}
          sets={totalSets}
          startIso={data.fechaInicio}
          topInset={insets.top}
        />
      </View>
    );
  }

  const footerHeight = FOOTER_BUTTON + insets.bottom + spacing.md;
  const bottomSpace = footerHeight + spacing.xl;
  const head = sessionTitle(data.observacion);
  const pendingStep = currentStep(blocks);
  const activeIsCardio = activeSource ? isCardio(activeSource) : false;
  const showingDone = Boolean(active?.done) && extra !== active?.item.id;

  const overview: OverviewItem[] = blocks.flatMap((block, blockIndex) =>
    block.items.map((item) => ({
      id: item.id,
      page: blockIndex,
      name: nameOf(item.source),
      badge: badgeOf(block, item),
      progress: progressLabel(item),
      done: isItemDone(item),
      exercise: withMedia(item.source.ejercicio),
    })),
  );

  const renderInputs = (source: WorkoutExercise) => {
    const draft = draftOf(source);
    const previous = reference(source);
    if (isCardio(source)) {
      return (
        <CardioLogger
          onSubmit={(set) => session.addCardioSet.mutate({ sessionExerciseId: source.id, set })}
          pending={session.addCardioSet.isPending}
          setNumber={source.series.length + 1}
        />
      );
    }
    if (isTimed(source)) {
      const hold = previous ? longestTimedSet(previous.exercise) : null;
      return (
        <TimedSetInputs
          lastTime={hold !== null && previous ? { seconds: hold, when: relativeDay(previous.workout.fechaInicio).toLowerCase() } : null}
          onChange={(next) => setDraft(source, next)}
          resetKey={source.series.length}
          targetSeconds={source.duracionSeg}
          value={draft}
        />
      );
    }
    const top = previous ? topSet(previous.exercise) : null;
    const increment = account.data?.pesoIncrementoKg ?? 2.5;
    return (
      <View style={{ gap: spacing.md }}>
        <SuggestedLoad exerciseId={source.ejercicio?.id} loads={loads} />
        <View
          style={{
            gap: spacing.smd,
            padding: spacing.md,
            borderRadius: radii.xxl,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceLow,
          }}
        >
          <Stepper
            decimal
            label="Peso"
            onChangeText={(pesoKg) => setDraft(source, { ...draft, pesoKg })}
            onStep={(direction) => setDraft(source, { ...draft, pesoKg: bump(draft.pesoKg, direction * increment, 0) })}
            spoken="kilos"
            testID="set-weight"
            unit="kg"
            value={draft.pesoKg}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Stepper
            label="Repeticiones"
            onChangeText={(repeticiones) => setDraft(source, { ...draft, repeticiones })}
            onStep={(direction) => setDraft(source, { ...draft, repeticiones: bump(draft.repeticiones, direction, 1) })}
            spoken="repeticiones"
            testID="set-reps"
            value={draft.repeticiones}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <RirPicker onChange={(rir) => setDraft(source, { ...draft, rir })} value={draft.rir} />
        </View>
        {top && previous ? (
          <PressableScale
            accessibilityHint="Rellena peso y repeticiones"
            accessibilityLabel={`La última vez, ${relativeDay(previous.workout.fechaInicio).toLowerCase()}: ${top.repeticiones} por ${kgLabel(top.pesoKg)} kilos`}
            haptic="selection"
            onPress={() => setDraft(source, { ...draft, pesoKg: kgLabel(top.pesoKg), repeticiones: String(top.repeticiones) })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouchTarget }}
            testID="last-time"
          >
            <Ionicons color={colors.textSecondary} name="time-outline" size={iconSizes.sm} />
            <Text style={{ flex: 1 }} tone="secondary" variant="subhead">
              {'La última vez: '}
              <Text strong tabular variant="subhead">
                {`${kgLabel(top.pesoKg)} kg × ${top.repeticiones}`}
              </Text>
            </Text>
            <Text tone="muted" variant="footnote">
              {relativeDay(previous.workout.fechaInicio).toLowerCase()}
            </Text>
          </PressableScale>
        ) : null}
      </View>
    );
  };

  const exercisesDone = blocks.reduce((sum, block) => sum + block.items.filter(isItemDone).length, 0);
  const pendingLines = blocks.flatMap((block) =>
    block.items
      .filter((item) => !isItemDone(item) && item.target !== null)
      .map((item) => {
        const left = (item.target ?? 0) - item.logged;
        return `${nameOf(item.source)} · ${left} ${left === 1 ? 'serie' : 'series'}`;
      }),
  );
  const minutes = Math.max(0, Math.round((Date.now() - new Date(data.fechaInicio).getTime()) / 60_000));

  const footer =
    page >= finishPage ? (
      blocks.length === 0 ? (
        <Button icon="add" label="Añadir ejercicio" onPress={() => setPickerOpen(true)} size="lg" style={{ flex: 1 }} testID="empty-add" />
      ) : (
        <Button
          label="Finalizar sesión"
          loading={session.finish.isPending}
          onPress={() => void onFinish()}
          size="lg"
          style={{ flex: 1 }}
          testID="finish-primary"
        />
      )
    ) : activeIsCardio ? null : showingDone ? (
      <Button
        icon="arrow-forward"
        label={pendingStep ? 'Siguiente ejercicio' : 'Ver el resumen'}
        onPress={() => goTo(pendingStep ? pendingStep.blockIndex : finishPage)}
        size="lg"
        style={{ flex: 1 }}
        testID="next-exercise"
      />
    ) : (
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
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="workout-focus">
      {/* El gesto de volver choca con deslizar entre ejercicios: aquí se sale con el botón. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <FocusHeader
        fills={blocks.map(blockFill)}
        onClose={minimize}
        onMore={() => afterSheet(() => setSheet('menu'))}
        page={page}
        position={page >= finishPage ? 'Resumen' : `${page + 1} de ${blocks.length}`}
        startIso={data.fechaInicio}
        title={head.title}
        topInset={insets.top}
      />

      <Animated.ScrollView
        bounces={false}
        contentOffset={{ x: initialPage * width, y: 0 }}
        decelerationRate="fast"
        horizontal
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          if (index !== page) {
            setPage(index);
            setExtra(null);
          }
        }}
        onScroll={onScroll}
        pagingEnabled
        ref={scrollRef}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        testID="workout-pager"
      >
        {blocks.map((block, index) => {
          const here = activeItemOf(blocks, index, chosen[index] ?? null);
          if (!here) return <View key={index} style={{ width }} />;
          const source = here.item.source;
          const grouped = block.kind !== 'single';
          const done = here.done && extra !== here.item.id;
          const exercise = withMedia(source.ejercicio);
          return (
            <FocusPage
              bottomSpace={bottomSpace}
              eyebrow={grouped ? `${blockName(block)} · ${roundLabel(here.step.round, block.rounds)}` : null}
              groupSwitch={
                grouped ? (
                  <GroupSwitch
                    activeId={here.item.id}
                    items={block.items.map((item) => ({
                      id: item.id,
                      badge: badgeOf(block, item) ?? '',
                      name: nameOf(item.source),
                      done: isItemDone(item),
                    }))}
                    onSelect={(itemId) => setChosen((all) => ({ ...all, [index]: itemId }))}
                  />
                ) : null
              }
              key={block.items.map((item) => item.id).join('+')}
              media={
                <PageMedia
                  compact={grouped}
                  exercise={exercise}
                  index={index}
                  onPress={source.ejercicio ? () => router.push(routes.exercise(source.ejercicio!.id)) : undefined}
                  scrollX={scrollX}
                  width={width}
                />
              }
              name={nameOf(source)}
              note={source.nota}
              target={targetOf(source)}
              testID={index === page ? 'workout-current' : `workout-page-${index}`}
              track={
                isCardio(source) ? null : (
                  <SetTrack current={done ? null : source.series.length + 1} sets={source.series} target={source.seriesObjetivo} />
                )
              }
              width={width}
            >
              {done ? (
                <Animated.View
                  entering={reduceMotion ? undefined : FadeIn.duration(220)}
                  style={{
                    gap: spacing.md,
                    padding: spacing.mdl,
                    borderRadius: radii.xxl,
                    borderCurve: 'continuous',
                    backgroundColor: colors.surfaceLow,
                  }}
                  testID="exercise-done"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
                    <Ionicons color={colors.success} name="checkmark-circle" size={iconSizes.xl} />
                    <View style={{ flex: 1 }}>
                      <Text strong variant="headline">
                        {isBlockDone(block) ? (grouped ? 'Bloque completo' : 'Ejercicio completo') : 'Este ya está'}
                      </Text>
                      <Text tone="secondary" variant="footnote">
                        {`Hiciste ${progressLabel(here.item)} series.`}
                      </Text>
                    </View>
                  </View>
                  <Button label="Hacer una serie extra" onPress={() => setExtra(here.item.id)} testID="extra-set" variant="ghost" />
                </Animated.View>
              ) : (
                renderInputs(source)
              )}
              {source.series.length > 0 ? (
                <PressableScale
                  accessibilityLabel="Deshacer la última serie"
                  disabled={session.removeSet.isPending}
                  haptic="none"
                  onPress={() => undoLast(source)}
                  style={{ alignSelf: 'center', minHeight: minTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.md }}
                  testID={index === page ? 'undo-set' : undefined}
                >
                  <Text tone="muted" variant="footnote">
                    Deshacer la última serie
                  </Text>
                </PressableScale>
              ) : null}
            </FocusPage>
          );
        })}
        <FinishPage
          bottomSpace={bottomSpace}
          complete={blocks.length > 0 && pendingStep === null}
          exercisesDone={exercisesDone}
          exercisesTotal={ordered.length}
          minutes={minutes}
          pending={pendingLines}
          sets={totalSets}
          volumeKg={Math.round(volumeOf(data))}
          width={width}
        />
      </Animated.ScrollView>

      {footer ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <LinearGradient
            colors={footerFade}
            locations={[0, 0.45, 1]}
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, top: -spacing.xl, bottom: 0 }}
          />
          <View style={{ flexDirection: 'row', paddingHorizontal: gutter, paddingBottom: insets.bottom + spacing.md }}>{footer}</View>
        </View>
      ) : null}

      <RestOverlay kind={restKind} />

      <SessionSheet
        currentPage={page}
        items={overview}
        mode={sheet}
        onAdd={() => fromMenu(() => setPickerOpen(true))}
        onCancel={() => fromMenu(() => void onCancel())}
        onClose={closeSheet}
        onFinish={() => fromMenu(() => void onFinish())}
        onOverview={() => setSheet('overview')}
        onSelect={(item) => {
          closeSheet();
          setChosen((all) => ({ ...all, [item.page]: item.id }));
          goTo(item.page);
        }}
        setsLabel={`${totalSets} ${totalSets === 1 ? 'serie registrada' : 'series registradas'}`}
      />
      <ExercisePicker
        onClose={() => setPickerOpen(false)}
        onSelect={(exerciseId) =>
          session.addExercise.mutate(exerciseId, {
            onSuccess: () => {
              setPickerOpen(false);
              // El nuevo va al final: se salta a su página (la que era la del resumen).
              setTimeout(() => goTo(finishPage), SHEET_CLOSE_MS);
            },
          })
        }
        pending={session.addExercise.isPending}
        visible={pickerOpen}
      />
    </View>
  );
}
