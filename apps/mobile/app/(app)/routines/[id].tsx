import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { RoutineExercise } from '@gymsheet/types';
import { Badge, Card, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { ErrorState, Skeleton } from '@/components/feedback';
import { MetricChip } from '@/components/list';
import { ExerciseImage } from '@/components/media';
import { BackLink } from '@/components/nav';
import { useExerciseMedia } from '@/api/use-exercise-media';
import { PressableScale } from '@/components/motion';
import { ApiError } from '@gymsheet/api-client';
import { routineService, workoutService } from '@/api/services';
import { Button } from '@/components/ui';
import { ScheduleRoutine } from '@/components/schedule-routine';
import { notify } from '@/notifications';
import { GOAL_LABEL } from '@/lib/format';
import { colors, fontSizes, spacing } from '@/theme';

/** «3 × 8-12» — the shorthand a lifter actually reads off a plan. */
function repRange(item: RoutineExercise): string {
  if (item.repsMin === null && item.repsMax === null) return `${item.seriesObjetivo} series`;
  const reps =
    item.repsMin !== null && item.repsMax !== null && item.repsMin !== item.repsMax
      ? `${item.repsMin}-${item.repsMax}`
      : `${item.repsMin ?? item.repsMax}`;
  return `${item.seriesObjetivo} × ${reps}`;
}

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const queryClient = useQueryClient();

  const routine = useQuery({
    queryKey: ['routine', id],
    queryFn: () => routineService.get(id),
    enabled: Boolean(id),
  });

  const start = useMutation({
    mutationFn: () => workoutService.startFromRoutine(id),
    onSuccess: async (session) => {
      // The new session must appear in the history and on the dashboard the
      // moment we navigate to it.
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      notify.success('Sesión iniciada.');
      router.replace({ pathname: '/workouts/[id]', params: { id: session.id } });
    },
    onError: async (error: Error) => {
      // The backend allows one open session at a time. Hitting that is not a
      // failure the user caused — it means training is already under way, so
      // take them there instead of showing a dead end.
      if (error instanceof ApiError && error.kind === 'conflict') {
        const history = await workoutService.list(20).catch(() => null);
        const open = history?.items.find((item) => item.estado === 'EN_PROGRESO');
        if (open) {
          notify.info('Ya tienes una sesión en curso.');
          router.replace({ pathname: '/workouts/[id]', params: { id: open.id } });
          return;
        }
      }
      notify.error(error);
    },
  });

  // Ordering and the media backfill both run before the early returns below.
  // `useExerciseMedia` is a hook, so reaching it only once the query resolves
  // makes the hook count jump between renders and React aborts with "Rendered
  // more hooks than during the previous render".
  const ordered = routine.data
    ? [...routine.data.ejercicios].sort((a, b) => a.orden - b.orden)
    : [];
  const withMedia = useExerciseMedia(ordered.map((item) => item.ejercicio));

  if (routine.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={90} />
        <Skeleton height={160} />
      </ScrollScreen>
    );
  }

  if (routine.isError) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={routine.error} onRetry={() => void routine.refetch()} />
      </ScrollScreen>
    );
  }

  const data = routine.data;

  return (
    <ScrollScreen onRefresh={() => void routine.refetch()} refreshing={routine.isFetching}>
      <BackLink />
      <ScreenHeader subtitle={data.descripcion ?? undefined} title={data.nombre} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Badge label={`${ordered.length} ejercicios`} />
        {data.objetivo ? <Badge label={GOAL_LABEL[data.objetivo]} tone="success" /> : null}
      </View>

      {/* The primary action of the screen: turn the plan into a live session. */}
      <Button
        label="Empezar rutina"
        loading={start.isPending}
        onPress={() => start.mutate()}
      />

      <Section index={0} title="Programar">
        <ScheduleRoutine routineId={data.id} />
      </Section>

      <Section index={1} title="Ejercicios">
        {ordered.map((item) => (
          <Card key={item.id}>
            <PressableScale
              disabled={!item.ejercicio}
              onPress={() =>
                item.ejercicio && router.push({ pathname: '/exercises/[id]', params: { id: item.ejercicio.id } })
              }
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              {item.ejercicio ? <ExerciseImage exercise={withMedia(item.ejercicio) ?? item.ejercicio} size={56} /> : null}
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  numberOfLines={2}
                  style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '600' }}
                >
                  {item.ejercicio?.nombre ?? 'Ejercicio no disponible'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                  {item.ejercicio?.grupoMuscular ?? '—'}
                </Text>
              </View>
            </PressableScale>

            {/* The plan in numbers: what to hit, how heavy, how long to rest. */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <MetricChip label="Objetivo" value={repRange(item)} />
              {item.pesoObjetivoKg !== null ? (
                <MetricChip label="Peso" value={`${item.pesoObjetivoKg} kg`} />
              ) : null}
              {item.descansoSeg !== null ? (
                <MetricChip label="Descanso" value={`${item.descansoSeg}s`} />
              ) : null}
              {item.rirObjetivo !== null ? (
                <MetricChip label="RIR" value={`${item.rirObjetivo}`} />
              ) : null}
            </View>

            {item.nota ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                {item.nota}
              </Text>
            ) : null}
          </Card>
        ))}
      </Section>
    </ScrollScreen>
  );
}
