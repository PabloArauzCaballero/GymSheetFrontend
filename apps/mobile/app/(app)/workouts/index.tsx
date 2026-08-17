import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Badge, Card, Divider, ScrollScreen, ScreenHeader } from '@/components/layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { NavRow } from '@/components/list';
import { Button } from '@/components/ui';
import { exportWorkoutHistoryCsv } from '@/lib/export-progress';
import { notify } from '@/notifications';
import { workoutService } from '@/api/services';
import {
  WORKOUT_LABEL,
  WORKOUT_TONE,
  formatDuration,
  formatTimeOfDay,
  relativeDay,
} from '@/lib/format';
import { spacing } from '@/theme';

export default function WorkoutsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const workouts = useQuery({
    queryKey: ['workouts', 'history'],
    queryFn: () => workoutService.list(30),
  });

  // Training without a routine has to be possible: most gym sessions are
  // improvised, and a plan is the exception rather than the entry point.
  const startFree = useMutation({
    mutationFn: () => workoutService.start(),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      notify.success('Sesión iniciada.');
      router.push({ pathname: '/workouts/[id]', params: { id: session.id } });
    },
    onError: (error: Error) => notify.error(error),
  });

  const inProgress = workouts.data?.items.find((item) => item.estado === 'EN_PROGRESO');

  const sessions = workouts.data?.items ?? [];

  const [exporting, setExporting] = useState(false);

  /**
   * Saving the history is the one action here that leaves the app, so it
   * reports what actually happened: a cancelled folder picker is not an error
   * and must not be dressed as one.
   */
  const onExport = async () => {
    setExporting(true);
    try {
      const result = await exportWorkoutHistoryCsv();
      if (result.status === 'cancelled') return;
      if (result.status === 'unsupported') {
        notify.error('Este dispositivo no permite guardar archivos.');
        return;
      }
      notify.success(`Guardado como ${result.location}`);
    } catch (error) {
      notify.error(error as Error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollScreen onRefresh={() => void workouts.refetch()} refreshing={workouts.isFetching}>
      <ScreenHeader
        subtitle={workouts.data ? `${workouts.data.total} sesiones registradas` : 'Tu historial.'}
        title="Entrenos"
      />

      <Button
        label={exporting ? 'Preparando CSV…' : 'Guardar mi avance (CSV)'}
        loading={exporting}
        onPress={() => void onExport()}
        variant="ghost"
      />

      {/* One primary action, and it changes with context: resume what is open,
          or start something new. */}
      {inProgress ? (
        <Button
          label="Continuar sesión en curso"
          onPress={() =>
            router.push({ pathname: '/workouts/[id]', params: { id: inProgress.id } })
          }
        />
      ) : (
        <Button
          label="Empezar entrenamiento"
          loading={startFree.isPending}
          onPress={() => startFree.mutate()}
        />
      )}

      {workouts.isPending ? (
        <View style={{ gap: spacing.sm }}>
          <Skeleton height={64} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </View>
      ) : workouts.isError ? (
        <ErrorState error={workouts.error} onRetry={() => void workouts.refetch()} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon="flame-outline"
          message="Cuando registres una sesión, quedará aquí con sus series y cargas."
          title="Todavía sin entrenos"
        />
      ) : (
        <Card>
          {sessions.map((session, index) => {
            const duration = formatDuration(session.fechaInicio, session.fechaFin);
            return (
              <View key={session.id}>
                {index > 0 ? <Divider /> : null}
                <NavRow
                  meta={
                    <Badge
                      label={WORKOUT_LABEL[session.estado]}
                      tone={WORKOUT_TONE[session.estado]}
                    />
                  }
                  onPress={() => router.push({ pathname: '/workouts/[id]', params: { id: session.id } })}
                  subtitle={[
                    `${session.ejercicios.length} ejercicios`,
                    duration,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  // The clock time is what tells two sessions on the same day
                  // apart. Home already does this; a history of fourteen rows
                  // all reading "Hace 2 días" distinguishes nothing at all.
                  title={[relativeDay(session.fechaInicio), formatTimeOfDay(session.fechaInicio)]
                    .filter(Boolean)
                    .join('  ')}
                />
              </View>
            );
          })}
        </Card>
      )}
    </ScrollScreen>
  );
}
