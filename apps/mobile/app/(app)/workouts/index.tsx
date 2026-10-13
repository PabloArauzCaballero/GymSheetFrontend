import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ScrollScreen, ScreenHeader } from '@/components/layout';
import { EnterUp } from '@/components/motion';
import { SessionRow } from '@/features/workout/session-row';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { TourTarget, useScreenTour } from '@/components/tour';
import { exportWorkoutHistory } from '@/lib/export-progress';
import { notify } from '@/notifications';
import { workoutService } from '@/api/services';
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

  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const lastOpen = useRef(0);
  const [pulling, setPulling] = useState(false);

  /**
   * Saving the history is the one action here that leaves the app, so it
   * reports what actually happened: a cancelled folder picker is not an error
   * and must not be dressed as one.
   */
  const onExport = async (format: 'csv' | 'pdf') => {
    setExporting(format);
    try {
      const result = await exportWorkoutHistory(format);
      if (result.status === 'cancelled') return;
      if (result.status === 'unsupported') {
        notify.error('Este dispositivo no permite guardar archivos.');
        return;
      }
      notify.success(`Guardado como ${result.location}`);
    } catch (error) {
      notify.error(error as Error);
    } finally {
      setExporting(null);
    }
  };

  useScreenTour('workouts');

  return (
    <ScrollScreen
      onRefresh={() => {
        // Solo el gesto enciende el indicador: una recarga en segundo plano no empuja la lista.
        setPulling(true);
        void workouts.refetch().finally(() => setPulling(false));
      }}
      refreshing={pulling}
    >
      {/* Entrenos era una pestaña y no necesitaba salida: la barra siempre
          estaba debajo. Al bajar al stack sí la necesita, y no basta con el
          gesto del sistema — es la razón por la que `BackLink` existe: «un
          control visible es la única affordance que sirve para todo el mundo,
          incluido quien usa lector de pantalla, para quien un camino que sólo
          es un gesto no es camino». Todas las demás pantallas empujadas lo
          llevan; ésta se habría quedado sin él justo al dejar de ser pestaña. */}
      <BackLink />
      <ScreenHeader
        subtitle={workouts.data ? `${workouts.data.total} ${workouts.data.total === 1 ? 'sesión registrada' : 'sesiones registradas'}` : 'Tu historial.'}
        title="Entrenos"
        tourKey="workouts"
      />

      {/* Dos formatos porque responden a dos preguntas distintas: el CSV es
          para analizar en una hoja de calculo, el PDF para ensenar a un
          entrenador o adjuntar en un correo. */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          icon="document-text-outline"
          label={exporting === 'pdf' ? 'Generando…' : 'Avance en PDF'}
          loading={exporting === 'pdf'}
          onPress={() => void onExport('pdf')}
          style={{ flex: 1 }}
          variant="ghost"
        />
        <Button
          icon="grid-outline"
          label={exporting === 'csv' ? 'Generando…' : 'Datos en CSV'}
          loading={exporting === 'csv'}
          onPress={() => void onExport('csv')}
          style={{ flex: 1 }}
          variant="ghost"
        />
      </View>

      {/* One primary action, and it changes with context: resume what is open,
          or start something new. */}
      <TourTarget id="workouts.list">
      {inProgress ? (
        <Button
          icon="play-circle-outline"
          label="Continuar sesión en curso"
          onPress={() =>
            router.push({ pathname: '/workouts/[id]', params: { id: inProgress.id } })
          }
        />
      ) : (
        <Button
          icon="add-circle-outline"
          label="Empezar entrenamiento"
          loading={startFree.isPending}
          onPress={() => {
            if (!startFree.isPending) startFree.mutate();
          }}
        />
      )}
      </TourTarget>

      {workouts.isPending ? (
        <View style={{ gap: spacing.sm }}>
          <Skeleton height={92} />
          <Skeleton height={92} />
          <Skeleton height={92} />
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
        <View style={{ gap: spacing.smd }}>
          {sessions.map((session, index) => (
            // Cascada corta, una sola vez: guía la vista hacia abajo al llegar.
            <EnterUp index={index} key={session.id}>
              <SessionRow
                onPress={() => {
                  // D6: dos toques seguidos no abren la sesión dos veces.
                  if (Date.now() - lastOpen.current < 600) return;
                  lastOpen.current = Date.now();
                  router.push({ pathname: '/workouts/[id]', params: { id: session.id } });
                }}
                session={session}
              />
            </EnterUp>
          ))}
        </View>
      )}
    </ScrollScreen>
  );
}
