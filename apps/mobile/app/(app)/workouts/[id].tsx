import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { SetEntryForm } from '@/components/set-entry-form';
import { RestTimer } from '@/components/rest-timer';
import { ExercisePicker } from '@/components/exercise-picker';
import { confirm, notify } from '@/notifications';
import { Badge, Card, Divider, ScrollScreen, ScreenHeader, Section, StatTile } from '@/components/layout';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ExerciseImage } from '@/components/media';
import { BackLink } from '@/components/nav';
import { useExerciseMedia } from '@/api/use-exercise-media';
import { PressableScale } from '@/components/motion';
import { workoutService } from '@/api/services';
import { useAmbientStore } from '@/state/ambient-store';
import { WORKOUT_LABEL, WORKOUT_TONE, formatDuration, relativeDay } from '@/lib/format';
import { colors, fontSizes, spacing } from '@/theme';

/** Standard rest between working sets; the timer can be extended in place. */
const DEFAULT_REST_SECONDS = 90;

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [restingFor, setRestingFor] = useState<number | null>(null);

  const workout = useQuery({
    queryKey: ['workout', id],
    queryFn: () => workoutService.get(id),
    enabled: Boolean(id),
  });

  /** Every write refreshes this session plus the lists that summarise it. */
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['workout', id] });
    void queryClient.invalidateQueries({ queryKey: ['workouts'] });
  };

  const addSet = useMutation({
    mutationFn: (input: {
      sessionExerciseId: string;
      pesoKg: number;
      repeticiones: number;
      rir: number;
      numeroSerie: number;
    }) =>
      workoutService.addSet(input.sessionExerciseId, {
        numeroSerie: input.numeroSerie,
        repeticiones: input.repeticiones,
        pesoKg: input.pesoKg,
        rir: input.rir,
        descansoSegAnterior: 0,
      }),
    onSuccess: async () => {
      await refreshAll();
      notify.success('Serie registrada.');
      // Logging a set is exactly when rest starts, so the clock appears without
      // being asked for — one less tap while the user is out of breath.
      setRestingFor((current) => current ?? DEFAULT_REST_SECONDS);
    },
    onError: (error: Error) => notify.error(error),
  });

  const removeSet = useMutation({
    mutationFn: (setId: string) => workoutService.removeSet(setId),
    onSuccess: async () => {
      await refreshAll();
      notify.success('Serie eliminada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const addExercise = useMutation({
    mutationFn: (exerciseId: string) =>
      workoutService.addExercise(id, {
        ejercicioId: exerciseId,
        // Appended at the end: the order of a live session is the order the
        // user actually trained in.
        orden: (workout.data?.ejercicios.length ?? 0) + 1,
      }),
    onSuccess: async () => {
      await refreshAll();
      setPickerOpen(false);
      notify.success('Ejercicio añadido.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const finish = useMutation({
    mutationFn: () => workoutService.finish(id),
    onSuccess: async () => {
      await refreshAll();
      notify.success('Sesión finalizada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const cancel = useMutation({
    mutationFn: () => workoutService.cancel(id),
    onSuccess: async () => {
      await refreshAll();
      notify.success('Sesión cancelada.');
      router.back();
    },
    onError: (error: Error) => notify.error(error),
  });

  // Ordering and the media backfill both run before the early returns below.
  // `useExerciseMedia` is a hook, so reaching it only once the query resolves
  // makes the hook count jump between renders and React aborts with "Rendered
  // more hooks than during the previous render".
  const ordered = workout.data
    ? [...workout.data.ejercicios].sort((a, b) => a.orden - b.orden)
    : [];
  const withMedia = useExerciseMedia(ordered.map((item) => item.ejercicio));

  /**
   * The backdrop picks up while a session is open and settles when it closes.
   *
   * Declared here with the other hooks, above the early returns: placed after
   * them it would run only once the query resolved, and the hook count would
   * change between renders — the exact crash this screen already had once.
   * The cleanup matters as much as the set: leaving the room "training" after
   * the user walks away turns a contextual cue into permanent noise.
   */
  const isLive = workout.data?.estado === 'EN_PROGRESO';
  const setAmbient = useAmbientStore((state) => state.setIntensity);
  useEffect(() => {
    setAmbient(isLive ? 'active' : 'calm');
    return () => setAmbient('calm');
  }, [isLive, setAmbient]);

  if (workout.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={90} />
        <Skeleton height={180} />
      </ScrollScreen>
    );
  }

  if (workout.isError) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={workout.error} onRetry={() => void workout.refetch()} />
      </ScrollScreen>
    );
  }

  const data = workout.data;
  const totalSets = ordered.reduce((sum, item) => sum + item.series.length, 0);
  // Tonnage: the single number that says how much work the session actually was.
  const volume = ordered.reduce(
    (sum, item) =>
      sum + item.series.reduce((acc, set) => acc + set.pesoKg * set.repeticiones, 0),
    0,
  );
  const duration = formatDuration(data.fechaInicio, data.fechaFin);
  const live = isLive;

  const onFinish = async () => {
    const result = await confirm({
      title: 'Finalizar sesión',
      message: `Se cerrará la sesión con ${totalSets} ${totalSets === 1 ? 'serie' : 'series'} registradas.`,
      confirmLabel: 'Finalizar',
      cancelLabel: 'Seguir entrenando',
    });
    if (result.confirmed) finish.mutate();
  };

  const onCancel = async () => {
    const result = await confirm({
      title: 'Cancelar sesión',
      message: 'Se descartará la sesión en curso. Esta acción no se puede deshacer.',
      severity: 'danger',
      confirmLabel: 'Cancelar sesión',
      cancelLabel: 'Volver',
    });
    if (result.confirmed) cancel.mutate();
  };

  return (
    <ScrollScreen
      onRefresh={() => void workout.refetch()}
      // Floated rather than placed in the list: rest starts at the top of the
      // screen where the set was logged, but the exercise list is long enough
      // that an inline timer scrolls out of sight exactly when it matters.
      overlay={
        live && restingFor !== null ? (
          <RestTimer autoStart onDone={() => setRestingFor(null)} seconds={restingFor} />
        ) : null
      }
      refreshing={workout.isFetching}
    >
      <BackLink />
      <ScreenHeader
        subtitle={duration ? `Duración ${duration}` : undefined}
        title={relativeDay(data.fechaInicio)}
      />

      <Badge label={WORKOUT_LABEL[data.estado]} tone={WORKOUT_TONE[data.estado]} />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <StatTile label="Ejercicios" value={`${ordered.length}`} />
        <StatTile label="Series" value={`${totalSets}`} />
        <StatTile label="Volumen" value={`${Math.round(volume)} kg`} />
      </View>

      {data.observacion ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 22 }}>
            {data.observacion}
          </Text>
        </Card>
      ) : null}

      <Section title="Ejercicios">
        {ordered.map((item) => (
          <Card key={item.id} accent={item.esEnfasis ? colors.volt : undefined}>
            <PressableScale
              disabled={!item.ejercicio}
              onPress={() => item.ejercicio && router.push({ pathname: '/exercises/[id]', params: { id: item.ejercicio.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              {item.ejercicio ? <ExerciseImage exercise={withMedia(item.ejercicio) ?? item.ejercicio} size={48} /> : null}
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  numberOfLines={2}
                  style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '600' }}
                >
                  {item.ejercicio?.nombre ?? 'Ejercicio no disponible'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                  {item.series.length} {item.series.length === 1 ? 'serie' : 'series'}
                </Text>
              </View>
              {item.esEnfasis ? <Badge label="Énfasis" tone="success" /> : null}
            </PressableScale>

            {item.series.length > 0 ? (
              <View style={{ gap: spacing.xs }}>
                <Divider />
                {/* One line per set: number, load × reps, and RIR. */}
                {[...item.series]
                  .sort((a, b) => a.numeroSerie - b.numeroSerie)
                  .map((set) => (
                    <View
                      key={set.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.md,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: fontSizes.xs,
                          fontVariant: ['tabular-nums'],
                          minWidth: 24,
                        }}
                      >
                        #{set.numeroSerie}
                      </Text>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: fontSizes.sm,
                          fontWeight: '600',
                          fontVariant: ['tabular-nums'],
                          flex: 1,
                        }}
                      >
                        {set.pesoKg} kg × {set.repeticiones}
                      </Text>
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: fontSizes.xs,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        RIR {set.rir}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : null}

            {item.nota ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                {item.nota}
              </Text>
            ) : null}

            {live ? (
              <>
                <Divider />
                {/* Pre-filled from the last set: the next one is usually the
                    same load, so a repeat costs one tap. */}
                <SetEntryForm
                  initial={(() => {
                    const last = [...item.series].sort(
                      (a, b) => b.numeroSerie - a.numeroSerie,
                    )[0];
                    return last
                      ? {
                          pesoKg: String(last.pesoKg),
                          repeticiones: String(last.repeticiones),
                          rir: String(last.rir),
                        }
                      : undefined;
                  })()}
                  onSubmit={(draft) =>
                    addSet.mutate({
                      sessionExerciseId: item.id,
                      numeroSerie: item.series.length + 1,
                      ...draft,
                    })
                  }
                  pending={addSet.isPending}
                />
                {item.series.length > 0 ? (
                  <PressableScale
                    accessibilityLabel="Deshacer última serie"
                    disabled={removeSet.isPending}
                    onPress={() => {
                      const last = [...item.series].sort(
                        (a, b) => b.numeroSerie - a.numeroSerie,
                      )[0];
                      if (last) removeSet.mutate(last.id);
                    }}
                  >
                    <Text
                      style={{
                        color: colors.danger,
                        fontSize: fontSizes.sm,
                        fontWeight: '600',
                        textAlign: 'center',
                      }}
                    >
                      Deshacer última serie
                    </Text>
                  </PressableScale>
                ) : null}
              </>
            ) : null}
          </Card>
        ))}
      </Section>

      {live ? (
        <Section index={1} title="Sesión en curso">
          <Button
            label="Añadir ejercicio"
            onPress={() => setPickerOpen(true)}
            variant="ghost"
          />
          <Button label="Finalizar sesión" loading={finish.isPending} onPress={() => void onFinish()} />
          <Button
            label="Cancelar sesión"
            loading={cancel.isPending}
            onPress={() => void onCancel()}
            variant="ghost"
          />
        </Section>
      ) : null}

      <ExercisePicker
        onClose={() => setPickerOpen(false)}
        onSelect={(exerciseId) => addExercise.mutate(exerciseId)}
        pending={addExercise.isPending}
        visible={pickerOpen}
      />
    </ScrollScreen>
  );
}
