import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isTimedSet, longestTimedSet, previousPerformance, topSet } from '@gymsheet/domain';
import { secondsLabel } from '@gymsheet/hooks';
import type { RestSettingChange, SkipReason, SkippedSet, TimedWorkoutSetInput, Workout, WorkoutExercise, WorkoutSetInput } from '@gymsheet/types';
import { useExerciseMedia } from '@/api/use-exercise-media';
import { ExercisePicker } from '@/components/exercise-picker';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { CardioLogger } from '@/features/cardio/cardio-logger';
import { SuggestedLoad, useNextLoads } from '@/features/programs/suggested-load';
import { FinishPage } from '@/features/workout/focus/finish-page';
import { FocusHeader } from '@/features/workout/focus/focus-header';
import { DoneCard, FocusPage, GroupSwitch, OmittedCard, PageMedia, QuietActions, RestPills, SetTrack } from '@/features/workout/focus/focus-page';
import { ReasonSheet, type ReasonSheetMode } from '@/features/workout/focus/reason-sheet';
import { RestSheet, type RestSheetResult, type RestSheetTarget } from '@/features/workout/focus/rest-sheet';
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
import { countSets, isNetworkFailure, volumeOf, type useWorkoutSession } from '@/features/workout/use-workout-session';
import {
  activeItemOf,
  blockFill,
  blockState,
  buildFlowBlocks,
  currentStep,
  FALLBACK_REST_SEC,
  isBlockDone,
  isItemDone,
  isStaleSession,
  kgLabel,
  nextSetNumber,
  openingWeight,
  pageAfterLogging,
  previousRestSeconds,
  progressLabel,
  restAfterLogging,
  restLabel,
  restTargets,
  roundLabel,
  sessionTitle,
  skipReasonLabel,
  stepFrom,
  withLoggedSet,
  withOmitted,
  withSkippedSet,
  type FlowBlock,
  type FlowStep,
} from '@/features/workout/workout-flow';
import { useWorkoutStore } from '@/features/workout/workout-store';
import { relativeDay } from '@/lib/format';
import { routes } from '@/lib/routes';
import { captureStreakLocation } from '@/lib/streak-location';
import { confirm, notify } from '@/notifications';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { useAmbientStore } from '@/state/ambient-store';
import { colors, footerFade, gutter, iconSizes, metricColors, minTouchTarget, radii, spacing } from '@/theme';

/** Alto del botón fijo. */
const FOOTER_BUTTON = 56;
/** Lo que tarda en cerrarse una hoja antes de poder abrir otra cosa encima (iOS no apila dos modales). */
const SHEET_CLOSE_MS = 360;
/** Tras un toque de navegación («Siguiente ejercicio»), los toques siguientes se ignoran este tiempo. */
const NAV_LOCK_MS = 450;
/** Una serie que no se guardó por la red se reintenta sola una vez, tras esta espera. */
const AUTO_RETRY_MS = 1500;
/** Páginas a cada lado de la actual que se pintan enteras; el resto son huecos (no gastan nada). */
const WINDOW = 1;

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


type FailedSet = { exerciseId: string; label: string };

/**
 * Entrenamiento en modo enfoque. Un ejercicio (o una superserie) por página, a
 * pantalla completa, y se avanza deslizando; arriba, un tramo por ejercicio
 * como en las historias. Una sola acción abajo, «Registrar serie». El descanso
 * entra a pantalla completa y bloquea lo demás hasta que termina o se salta.
 * Saltar una serie, omitir el ejercicio y cambiar el descanso están en la
 * página, discretos; añadir, finalizar y cancelar viven en ⋯. La última página
 * es el cierre.
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
  const retimeRest = useWorkoutStore((state) => state.retimeRest);
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
  const [reason, setReason] = useState<{ mode: Exclude<ReasonSheetMode, null>; exerciseId: string } | null>(null);
  const [restTarget, setRestTarget] = useState<RestSheetTarget | null>(null);
  const [failed, setFailed] = useState<FailedSet | null>(null);
  const [celebrated, setCelebrated] = useState<string | null>(null);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(initialPage * width);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const goTo = useCallback(
    (index: number, from: number) => {
      const target = Math.max(0, Math.min(finishPage, index));
      // Un salto de varias páginas no pasa por las de en medio (son huecos): se va directo.
      const animated = !reduceMotion && Math.abs(target - from) <= WINDOW;
      scrollRef.current?.scrollTo({ x: target * width, animated });
      setPage(target);
    },
    [finishPage, reduceMotion, scrollRef, width],
  );

  // D6: un segundo toque mientras la página viaja (o mientras se guarda) no hace nada.
  const navLockedUntil = useRef(0);
  const navigate = (index: number) => {
    const now = Date.now();
    if (now < navLockedUntil.current) return;
    navLockedUntil.current = now + NAV_LOCK_MS;
    setExtra(null);
    goTo(index, page);
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

  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

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

  const numberOf = (source: WorkoutExercise) =>
    nextSetNumber(
      source.series.map((set) => set.numeroSerie),
      source.saltadas.map((skip) => skip.numeroSerie),
    );

  /** Lo que viene después de un paso, listo para la pantalla de descanso. */
  const describeNext = (after: ReadonlyArray<FlowBlock<Item>>, next: FlowStep | null, ownerId: string, finished: string | null) => {
    const nextBlock = next ? after[next.blockIndex] : undefined;
    const nextSource = next ? ordered.find((item) => item.id === next.itemId) : undefined;
    const label = next ? [stepLabel(after, next), nextSource ? previewOf(nextSource) : null].filter(Boolean).join(' · ') : null;
    const detail =
      next && nextSource && nextBlock
        ? {
            name: nameOf(nextSource),
            step: nextBlock.kind === 'single' ? `Serie ${next.round}` : roundLabel(next.round, nextBlock.rounds),
            load: previewOf(nextSource),
            loadKind: isTimed(nextSource) ? ('time' as const) : ('weight' as const),
            exercise: withMedia(nextSource.ejercicio),
            restOwnerId: ownerId,
            finished,
          }
        : null;
    return { label, detail };
  };

  const totalSets = countSets(data);
  const logging = useRef(false);

  const logSet = () => {
    if (!active || !activeSource) return;
    // D6: el doble toque no registra dos series.
    if (logging.current || session.addSet.isPending) return;
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
    const numeroSerie = numberOf(activeSource);
    const set: WorkoutSetInput | TimedWorkoutSetInput = {
      numeroSerie,
      ...parsed,
      // El descanso real: desde la última serie registrada en la sesión.
      descansoSegAnterior: previousRestSeconds(ordered.flatMap((item) => item.series.map((s) => s.fechaRegistro))),
    };
    const loggedId = activeSource.id;
    const loggedName = nameOf(activeSource);
    const blockIndex = active.step.blockIndex;
    const from = page;
    const after = withLoggedSet(blocks, loggedId);
    const next = stepFrom(after, blockIndex);
    const rest = restAfterLogging(after, loggedId);
    const afterBlock = after[blockIndex];
    const closed = afterBlock && isBlockDone(afterBlock) ? (afterBlock.kind === 'single' ? `${loggedName} completo` : `${blockName(afterBlock)} completa`) : null;
    const upcoming = describeNext(after, next, loggedId, closed);

    logging.current = true;
    setFailed(null);
    // El descanso arranca con el toque, no cuando contesta el servidor: antes
    // tardaba lo que tardara la red y a veces parecía que no había empezado.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    startRest(id, rest.seconds, upcoming.label, rest.kind, upcoming.detail);
    // El borrador se guarda: la serie siguiente abre con lo que se acaba de hacer.
    setDraft(activeSource, draft);

    const send = (attempt: number) => {
      session.addSet.mutate(
        { sessionExerciseId: loggedId, set },
        {
          onSuccess: () => {
            logging.current = false;
            setExtra(null);
            setChosen((all) => Object.fromEntries(Object.entries(all).filter(([key]) => Number(key) !== blockIndex)));
            if (closed) setCelebrated(loggedId);
            // Debajo del descanso la pantalla ya queda en lo que viene.
            const target = pageAfterLogging(after, next);
            if (target !== from) goTo(target, from);
            AccessibilityInfo.announceForAccessibility(`Serie ${numeroSerie} registrada.${upcoming.label ? ` Siguiente: ${upcoming.label}.` : ''}`);
          },
          onError: (error) => {
            // Sin red: un reintento solo, con el descanso corriendo (lo normal es que entre).
            if (isNetworkFailure(error) && attempt === 0) {
              retryTimer.current = setTimeout(() => send(1), AUTO_RETRY_MS);
              return;
            }
            logging.current = false;
            // No se guardó: no hay descanso que hacer, y lo tecleado sigue en la página.
            skipRest();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setFailed({ exerciseId: loggedId, label: previewOf(activeSource) ?? `serie ${numeroSerie}` });
            if (!isNetworkFailure(error)) notify.error(error as Error);
          },
        },
      );
    };
    send(0);
  };

  /** Lo último que se hizo o se saltó en el ejercicio: es lo que deshace «Deshacer». */
  const undoLast = (source: WorkoutExercise) => {
    const lastSet = [...source.series].sort((a, b) => b.numeroSerie - a.numeroSerie)[0];
    const lastSkip = [...source.saltadas].sort((a, b) => b.numeroSerie - a.numeroSerie)[0];
    if (lastSkip && (!lastSet || lastSkip.numeroSerie > lastSet.numeroSerie)) {
      session.undoSkip.mutate({ exerciseId: source.id, skip: lastSkip });
      return;
    }
    if (!lastSet) return;
    // Deshacer una serie deshace también su descanso.
    skipRest();
    session.removeSet.mutate(lastSet.id);
  };

  const undoSkip = (source: WorkoutExercise, skip: SkippedSet) => session.undoSkip.mutate({ exerciseId: source.id, skip });

  /** D1 · saltar la serie que toca: se anota el motivo, no hay descanso y el flujo avanza. */
  const skipSetOf = (source: WorkoutExercise, motivo: SkipReason, nota: string | null) => {
    const blockIndex = blocks.findIndex((block) => block.items.some((item) => item.id === source.id));
    const numeroSerie = numberOf(source);
    const after = withSkippedSet(blocks, source.id);
    const next = stepFrom(after, Math.max(0, blockIndex));
    skipRest();
    void Haptics.selectionAsync();
    session.skipSet.mutate({ exerciseId: source.id, numeroSerie, motivo, nota });
    setExtra(null);
    setChosen((all) => Object.fromEntries(Object.entries(all).filter(([key]) => Number(key) !== blockIndex)));
    const target = pageAfterLogging(after, next);
    if (target !== page) goTo(target, page);
    AccessibilityInfo.announceForAccessibility(`Serie ${numeroSerie} saltada: ${skipReasonLabel(motivo)}.`);
    if (motivo === 'DOLOR') notify.info('Si duele, parar es entrenar bien. Si la molestia sigue, coméntalo con tu entrenador.');
  };

  /** D1 · omitir el ejercicio: lo hecho se conserva, lo que falta no se pide más hoy. */
  const omitOf = (source: WorkoutExercise, motivo: SkipReason, nota: string | null) => {
    const blockIndex = blocks.findIndex((block) => block.items.some((item) => item.id === source.id));
    const after = withOmitted(blocks, source.id);
    const next = stepFrom(after, Math.max(0, blockIndex));
    skipRest();
    void Haptics.selectionAsync();
    session.omitExercise.mutate({ exerciseId: source.id, motivo, nota });
    setExtra(null);
    setChosen((all) => Object.fromEntries(Object.entries(all).filter(([key]) => Number(key) !== blockIndex)));
    const target = pageAfterLogging(after, next);
    if (target !== page) goTo(target, page);
    AccessibilityInfo.announceForAccessibility(`${nameOf(source)} omitido: ${skipReasonLabel(motivo)}.`);
  };

  /** D2 · la hoja de descanso de un ejercicio, con lo que tiene ahora. */
  const openRest = (source: WorkoutExercise) => {
    const block = blocks.find((candidate) => candidate.items.some((item) => item.id === source.id));
    if (!block) return;
    const grouped = block.kind !== 'single';
    const link = session.routineLink.data;
    setRestTarget({
      exerciseId: source.id,
      name: grouped ? blockName(block) : nameOf(source),
      restSec: (grouped ? block.restAfter : source.descansoSeg) ?? FALLBACK_REST_SEC,
      betweenSec: grouped ? block.between : null,
      workSec: isTimed(source) ? source.duracionSeg : null,
      others: restTargets(blocks, source.id, 'remaining').filter((item) => !block.items.some((own) => own.id === item.id)).length,
      canSaveToRoutine: Boolean(link?.editable && link.rutinaId),
      routineName: link?.nombre ?? null,
    });
  };

  const applyRest = (result: RestSheetResult) => {
    const target = restTarget;
    setRestTarget(null);
    if (!target) return;
    const ownBlock = blocks.find((block) => block.items.some((item) => item.id === target.exerciseId));
    if (!ownBlock) return;
    const scopeItems = result.scope === 'remaining' ? restTargets(blocks, target.exerciseId, 'remaining') : [];
    // El bloque del ejercicio entra siempre entero: su descanso de vuelta lo marca el último.
    const ids = new Set<string>([...ownBlock.items.map((item) => item.id), ...scopeItems.map((item) => item.id)]);
    const cambios: RestSettingChange[] = [];
    for (const block of blocks) {
      for (const item of block.items) {
        if (!ids.has(item.id)) continue;
        const change: RestSettingChange = { sesionEjercicioId: item.id, descansoSeg: result.restSec };
        if (block.kind !== 'single' && result.betweenSec !== null) change.descansoEntreSeg = result.betweenSec;
        if (item.id === target.exerciseId && result.workSec !== null && isTimed(item.source)) change.duracionSeg = result.workSec;
        cambios.push(change);
      }
    }
    // Si se está descansando ahora mismo de uno de esos ejercicios, el reloj en marcha también cambia.
    const running = useWorkoutStore.getState();
    const ownerId = running.restNextDetail?.restOwnerId;
    if (running.restEndsAt !== null && ownerId && ids.has(ownerId)) {
      const seconds = running.restKind === 'between' && result.betweenSec !== null ? result.betweenSec : result.restSec;
      if (seconds > 0) retimeRest(seconds);
      else skipRest();
    }
    const who = cambios.length === 1 || result.scope === 'one' ? 'para este ejercicio' : `para ${cambios.length} ejercicios`;
    session.applyRest.mutate(
      { cambios, guardarEnRutina: result.saveToRoutine },
      {
        onSuccess: (response) => {
          if (result.saveToRoutine && !response.rutina.guardado) {
            notify.info(`Descanso de ${restLabel(result.restSec)} ${who}. No se pudo guardar en la rutina: vale para hoy.`);
          } else {
            notify.success(`Descanso de ${restLabel(result.restSec)} ${who}${response.rutina.guardado ? ', y guardado en tu rutina' : ''}.`);
          }
        },
        // Sin red o sin la ruta en el servidor, el cambio vale para hoy (queda en el teléfono).
        onError: () => notify.success(`Descanso de ${restLabel(result.restSec)} ${who}.`),
      },
    );
  };

  const onFinish = async () => {
    if (session.finish.isPending) return;
    const result = await confirm({
      title: 'Finalizar sesión',
      message:
        totalSets > 0
          ? `Se guardará con ${totalSets} ${totalSets === 1 ? 'serie registrada' : 'series registradas'}.`
          : 'No has registrado ninguna serie. Se guardará vacía.',
      confirmLabel: 'Finalizar',
      cancelLabel: 'Seguir',
    });
    if (!result.confirmed || session.finish.isPending) return;
    skipRest();
    // El permiso de ubicación se pide después de confirmar, no antes.
    const location = await captureStreakLocation();
    session.finish.mutate(location ?? undefined);
  };

  const onCancel = async () => {
    if (session.cancel.isPending) return;
    const result = await confirm({
      title: 'Cancelar sesión',
      message: 'Se descartará la sesión y lo que hayas registrado. No se puede deshacer.',
      severity: 'danger',
      confirmLabel: 'Cancelar sesión',
      cancelLabel: 'Volver',
    });
    if (result.confirmed && !session.cancel.isPending) session.cancel.mutate();
  };

  const minimize = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // iOS no presenta un modal mientras otro se está cerrando: lo que se abra
  // justo después de cerrar la hoja espera a que termine de irse. Sin esto, un
  // toque rápido en ⋯ dejaba la hoja sin abrir.
  const sheetClosedAt = useRef(0);
  const markSheetClosed = () => {
    sheetClosedAt.current = Date.now();
  };
  const closeSheet = () => {
    markSheetClosed();
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
  const activeOmitted = Boolean(activeSource?.omitido);
  const showingDone = (Boolean(active?.done) && extra !== active?.item.id) || activeOmitted;

  const overview: OverviewItem[] = blocks.flatMap((block, blockIndex) =>
    block.items.map((item) => ({
      id: item.id,
      page: blockIndex,
      name: nameOf(item.source),
      badge: badgeOf(block, item),
      progress: progressLabel(item),
      done: isItemDone(item),
      omitted: item.source.omitido !== null,
      exercise: withMedia(item.source.ejercicio),
    })),
  );

  const renderInputs = (source: WorkoutExercise) => {
    const draft = draftOf(source);
    const previous = reference(source);
    if (isCardio(source)) {
      return (
        <CardioLogger
          onSubmit={(set) => {
            // D6: un segundo toque mientras se guarda no registra dos tramos.
            if (session.addCardioSet.isPending) return;
            const from = page;
            const after = withLoggedSet(blocks, source.id);
            const blockIndex = blocks.findIndex((block) => block.items.some((item) => item.id === source.id));
            session.addCardioSet.mutate(
              { sessionExerciseId: source.id, set },
              {
                // Guardado: se pasa solo a lo que viene (o al resumen), como con una serie.
                onSuccess: () => {
                  const target = pageAfterLogging(after, stepFrom(after, Math.max(0, blockIndex)));
                  if (target !== from) goTo(target, from);
                },
              },
            );
          }}
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
            icon="barbell-outline"
            label="Peso"
            metric="weight"
            onChangeText={(pesoKg) => setDraft(source, { ...draft, pesoKg })}
            onStep={(direction) => setDraft(source, { ...draft, pesoKg: bump(draft.pesoKg, direction * increment, 0) })}
            spoken="kilos"
            testID="set-weight"
            unit="kg"
            value={draft.pesoKg}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Stepper
            icon="repeat-outline"
            label="Repeticiones"
            metric="reps"
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
            <Ionicons color={metricColors.time.ink} name="time-outline" size={iconSizes.sm} />
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

  const exercisesDone = blocks.reduce((sum, block) => sum + block.items.filter((item) => isItemDone(item) && !item.source.omitido).length, 0);
  const pendingLines = blocks.flatMap((block) =>
    block.items
      .filter((item) => !isItemDone(item) && item.target !== null)
      .map((item) => {
        const left = (item.target ?? 0) - item.logged - (item.skipped ?? 0);
        return `${nameOf(item.source)} · ${left} ${left === 1 ? 'serie' : 'series'}`;
      }),
  );
  const skippedSets = ordered.reduce((sum, item) => sum + item.saltadas.length, 0);
  const omittedLines = ordered.filter((item) => item.omitido).map((item) => `${nameOf(item)} · ${skipReasonLabel(item.omitido?.motivo ?? 'OTRO')}`);
  const minutes = Math.max(0, Math.round((Date.now() - new Date(data.fechaInicio).getTime()) / 60_000));

  const footer =
    page >= finishPage ? (
      blocks.length === 0 ? (
        <Button icon="add" label="Añadir ejercicio" onPress={() => setPickerOpen(true)} size="lg" style={{ flex: 1 }} testID="empty-add" />
      ) : (
        <Button
          icon="flag"
          label="Finalizar sesión"
          loading={session.finish.isPending}
          onPress={() => void onFinish()}
          size="lg"
          style={{ flex: 1 }}
          testID="finish-primary"
        />
      )
    ) : activeIsCardio && !showingDone ? null : showingDone ? (
      <Button
        icon="arrow-forward"
        label={pendingStep ? 'Siguiente ejercicio' : 'Ver el resumen'}
        onPress={() => navigate(pendingStep ? pendingStep.blockIndex : finishPage)}
        size="lg"
        style={{ flex: 1 }}
        testID="next-exercise"
      />
    ) : (
      <>
        {/* Saltar la serie, a la vista y al alcance del pulgar, pero sin competir con registrar. */}
        <PressableScale
          accessibilityHint="Te pregunta el motivo"
          accessibilityLabel="Saltar serie"
          haptic="selection"
          onPress={() => {
            if (!activeSource || logging.current) return;
            setReason({ mode: { kind: 'set', label: `Serie ${numberOf(activeSource)} de ${nameOf(activeSource)}` }, exerciseId: activeSource.id });
          }}
          scaleTo={0.95}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            height: FOOTER_BUTTON,
            paddingHorizontal: spacing.md,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceHighest,
          }}
          testID="skip-set"
        >
          <Ionicons color={colors.textSecondary} name="play-skip-forward" size={iconSizes.sm} />
          <Text strong tone="secondary" variant="subhead">
            Saltar
          </Text>
        </PressableScale>
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
      </>
    );

  const restOwner = () => {
    const ownerId = useWorkoutStore.getState().restNextDetail?.restOwnerId;
    return ordered.find((item) => item.id === ownerId) ?? activeSource;
  };

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
        states={blocks.map(blockState)}
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
          const pageKey = block.items.map((item) => item.id).join('+');
          const here = activeItemOf(blocks, index, chosen[index] ?? null);
          // D6: solo se pintan la página a la vista y sus vecinas. Con todas montadas, cada
          // toque en −/+ repintaba todas las imágenes y campos de la sesión.
          if (!here || Math.abs(index - page) > WINDOW) return <View key={pageKey} style={{ width }} />;
          const source = here.item.source;
          const grouped = block.kind !== 'single';
          const omitted = source.omitido;
          const done = here.done && extra !== here.item.id && !omitted;
          const exercise = withMedia(source.ejercicio);
          const cardio = isCardio(source);
          const hasHistory = source.series.length + source.saltadas.length > 0;
          const isHere = index === page;
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
                      omitted: item.source.omitido !== null,
                    }))}
                    onSelect={(itemId) => setChosen((all) => ({ ...all, [index]: itemId }))}
                  />
                ) : null
              }
              index={index}
              key={pageKey}
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
              scrollX={scrollX}
              target={targetOf(source)}
              testID={isHere ? 'workout-current' : `workout-page-${index}`}
              aside={
                cardio || omitted ? null : (
                  <RestPills
                    betweenSec={grouped ? block.between : null}
                    onPress={() => openRest(source)}
                    restSec={(grouped ? block.restAfter : source.descansoSeg) ?? FALLBACK_REST_SEC}
                    workSec={isTimed(source) ? source.duracionSeg : null}
                  />
                )
              }
              track={
                cardio ? null : (
                  <SetTrack
                    current={done || omitted ? null : numberOf(source)}
                    onUndoSkip={(skip) => undoSkip(source, skip)}
                    sets={source.series}
                    skipped={source.saltadas}
                    target={source.seriesObjetivo}
                  />
                )
              }
              width={width}
            >
              {isHere && failed?.exerciseId === source.id ? (
                <Animated.View
                  accessibilityLiveRegion="assertive"
                  entering={reduceMotion ? undefined : FadeInDown.duration(220)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.smd,
                    padding: spacing.smd,
                    borderRadius: radii.lg,
                    borderCurve: 'continuous',
                    backgroundColor: metricColors.effort.tint,
                  }}
                  testID="set-failed"
                >
                  <Ionicons color={metricColors.effort.ink} name="cloud-offline-outline" size={iconSizes.md} />
                  <View style={{ flex: 1 }}>
                    <Text strong variant="subhead">
                      No se guardó la serie
                    </Text>
                    <Text tone="secondary" variant="footnote">
                      {`Tu ${failed.label} sigue aquí. Revisa la conexión y vuelve a intentarlo.`}
                    </Text>
                  </View>
                  <Button label="Reintentar" loading={session.addSet.isPending} onPress={logSet} testID="set-retry" variant="secondary" />
                </Animated.View>
              ) : null}
              {omitted ? (
                <OmittedCard
                  busy={session.resumeExercise.isPending}
                  mark={omitted}
                  onResume={() => session.resumeExercise.mutate({ exerciseId: source.id, onServer: data.ejercicios.some((item) => item.id === source.id) })}
                />
              ) : done ? (
                <DoneCard
                  celebrate={celebrated === source.id}
                  detail={
                    source.saltadas.length > 0
                      ? `Hiciste ${source.series.length} y saltaste ${source.saltadas.length}.`
                      : `Hiciste ${progressLabel(here.item)} series.`
                  }
                  onExtra={() => setExtra(here.item.id)}
                  title={isBlockDone(block) ? (grouped ? 'Bloque completo' : source.saltadas.length > 0 ? 'Ejercicio cerrado' : 'Ejercicio completo') : 'Este ya está'}
                />
              ) : (
                renderInputs(source)
              )}
              {omitted ? null : (
                <QuietActions
                  actions={[
                    ...(!done
                      ? [
                          {
                            key: 'omit',
                            icon: 'remove-circle-outline' as const,
                            label: 'Omitir ejercicio',
                            onPress: () => setReason({ mode: { kind: 'exercise', label: nameOf(source) }, exerciseId: source.id }),
                            testID: isHere ? 'omit-exercise' : undefined,
                          },
                        ]
                      : []),
                    ...(hasHistory && !cardio
                      ? [
                          {
                            key: 'undo',
                            icon: 'arrow-undo-outline' as const,
                            label: 'Deshacer',
                            onPress: () => undoLast(source),
                            disabled: session.removeSet.isPending || session.undoSkip.isPending,
                            testID: isHere ? 'undo-set' : undefined,
                          },
                        ]
                      : []),
                  ]}
                />
              )}
            </FocusPage>
          );
        })}
        <FinishPage
          bottomSpace={bottomSpace}
          complete={blocks.length > 0 && pendingStep === null}
          exercisesDone={exercisesDone}
          exercisesTotal={ordered.length}
          minutes={minutes}
          omitted={omittedLines}
          pending={pendingLines}
          sets={totalSets}
          skippedSets={skippedSets}
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
          <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: gutter, paddingBottom: insets.bottom + spacing.md }}>{footer}</View>
        </View>
      ) : null}

      <RestOverlay
        kind={restKind}
        onChangeRest={() => {
          const owner = restOwner();
          if (owner) afterSheet(() => openRest(owner));
        }}
      />

      <SessionSheet
        currentName={activeSource && !activeOmitted && !active?.done ? nameOf(activeSource) : undefined}
        currentPage={page}
        items={overview}
        mode={sheet}
        onAdd={() => fromMenu(() => setPickerOpen(true))}
        onCancel={() => fromMenu(() => void onCancel())}
        onClose={closeSheet}
        onFinish={() => fromMenu(() => void onFinish())}
        onOmit={
          activeSource && !activeOmitted && !active?.done
            ? () => fromMenu(() => setReason({ mode: { kind: 'exercise', label: nameOf(activeSource) }, exerciseId: activeSource.id }))
            : undefined
        }
        onOverview={() => setSheet('overview')}
        onRest={activeSource && !activeIsCardio ? () => fromMenu(() => openRest(activeSource)) : undefined}
        onSelect={(item) => {
          closeSheet();
          setChosen((all) => ({ ...all, [item.page]: item.id }));
          setExtra(null);
          goTo(item.page, page);
        }}
        restLabel={
          activeSource
            ? restLabel(
                (blocks[page]?.kind !== 'single' ? blocks[page]?.restAfter : activeSource.descansoSeg) ?? FALLBACK_REST_SEC,
              )
            : undefined
        }
        setsLabel={`${totalSets} ${totalSets === 1 ? 'serie registrada' : 'series registradas'}`}
      />
      <ReasonSheet
        mode={reason?.mode ?? null}
        onChoose={(motivo, nota) => {
          const current = reason;
          markSheetClosed();
          setReason(null);
          const source = current ? ordered.find((item) => item.id === current.exerciseId) : undefined;
          if (!current || !source) return;
          if (current.mode.kind === 'set') skipSetOf(source, motivo, nota);
          else omitOf(source, motivo, nota);
        }}
        onClose={() => {
          markSheetClosed();
          setReason(null);
        }}
      />
      <RestSheet
        onApply={(result) => {
          markSheetClosed();
          applyRest(result);
        }}
        onClose={() => {
          markSheetClosed();
          setRestTarget(null);
        }}
        target={restTarget}
      />
      <ExercisePicker
        onClose={() => setPickerOpen(false)}
        onSelect={(exerciseId) => {
          // D6: un segundo toque mientras se añade no lo añade dos veces.
          if (session.addExercise.isPending) return;
          session.addExercise.mutate(exerciseId, {
            onSuccess: () => {
              setPickerOpen(false);
              // El nuevo va al final: se salta a su página (la que era la del resumen).
              setTimeout(() => goTo(finishPage, page), SHEET_CLOSE_MS);
            },
          });
        }}
        pending={session.addExercise.isPending}
        visible={pickerOpen}
      />
    </View>
  );
}
