import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { sessionInsights } from '@gymsheet/domain';
import { workoutService } from '@/api/services';
import { Skeleton } from '@/components/feedback';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { SessionSummary } from '@/components/session-summary';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { SessionCardioBlock } from '@/features/cardio/session-cardio-block';
import { SessionProgramBlock } from '@/features/programs/session-program-block';
import { SessionHero } from '@/features/session-summary/session-hero';
import { SessionRecords } from '@/features/session-summary/session-records';
import { useSessionRewardStore } from '@/state/session-reward-store';
import { spacing } from '@/theme';

/**
 * «Sesión terminada» (C8.3.6): primero lo que movió la sesión (volumen y su
 * comparación), después los récords —con la única celebración que rebota— y
 * al final los puntos y los bloques del programa.
 *
 * Reemplaza a la sesión en la pila, así que «atrás» no vuelve a una sesión ya
 * cerrada. Si la app se reinició aquí y la sesión ya no está en memoria, lo
 * dice y lleva a la senda, donde los puntos sí están.
 */
export default function SessionSummaryScreen() {
  const router = useRouter();
  const last = useSessionRewardStore((state) => state.last);
  const clear = useSessionRewardStore((state) => state.clear);

  // Se vacía al salir, no al pulsar: vaciarlo antes de navegar pintaría un
  // fotograma del estado vacío.
  useEffect(() => clear, [clear]);

  // La sesión cerrada y el historial reciente (la misma caché que Inicio), para
  // los récords y la comparación. Si fallan, el resumen sigue con lo que trajo
  // el cierre: un dato de más nunca debe tapar el resto.
  const session = useQuery({
    queryKey: ['workout', last?.sessionId],
    queryFn: () => workoutService.get(last?.sessionId ?? ''),
    enabled: Boolean(last?.sessionId),
  });
  const history = useQuery({
    queryKey: ['workouts', 'recent'],
    queryFn: () => workoutService.list(40),
    enabled: Boolean(last?.sessionId),
  });

  const goToList = () => router.replace('/workouts');

  if (!last) {
    return (
      <ScrollScreen>
        <ScreenHeader title="Sesión terminada" />
        <Text tone="secondary" variant="body">
          Tu sesión se guardó y sus puntos ya están en tu senda.
        </Text>
        <Button label="Ver mi senda" onPress={() => router.replace('/trayectoria')} />
        <Button label="Seguir" onPress={goToList} variant="ghost" />
      </ScrollScreen>
    );
  }

  const insights = session.data ? sessionInsights(session.data, history.data?.items ?? []) : null;
  const loadingInsights = session.isPending || (history.isPending && !history.isError);

  return (
    <ScrollScreen>
      <ScreenHeader title="Sesión terminada" />

      {loadingInsights && !session.isError ? (
        <Skeleton height={196} />
      ) : (
        <SessionHero
          comparison={insights?.comparison ?? null}
          duration={last.duration}
          exercises={session.data ? session.data.ejercicios.length : null}
          sets={insights?.sets ?? last.sets}
          volumeKg={insights?.volumeKg ?? last.volumeKg}
        />
      )}

      {insights ? <SessionRecords records={insights.records} /> : null}

      <View style={{ gap: spacing.lg }}>
        {last.reward ? <SessionSummary onContinue={goToList} session={{ ...last, reward: last.reward }} /> : null}
        {last.programa ? <SessionProgramBlock block={last.programa} workoutId={last.sessionId} /> : null}
        {last.cardio ? <SessionCardioBlock block={last.cardio} /> : null}
        {!last.reward ? <Button label="Seguir" onPress={goToList} /> : null}
      </View>
    </ScrollScreen>
  );
}
