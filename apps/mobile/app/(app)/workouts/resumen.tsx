import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { sessionInsights } from '@gymsheet/domain';
import type { Routine } from '@gymsheet/types';
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
import { sessionShareLines } from '@/features/session-summary/session-share';
import { shareWithBrand } from '@/lib/share-brand';
import { useSessionRewardStore } from '@/state/session-reward-store';
import { spacing } from '@/theme';

/**
 * «Sesión terminada» (C8.3.6, rediseño 2026-10-18): arriba, sin desplazarse, la
 * portada que se captura —qué se terminó, el volumen, la comparación, los
 * récords y los hechos— con «Compartir» como acción secundaria (#102, #93). Debajo,
 * el detalle de los récords, los puntos y los bloques del programa.
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

  // El nombre del día o de la rutina, solo si ya está en caché (lo dejó el
  // entreno o la ficha de la rutina): no se pide nada nuevo por un rótulo.
  const queryClient = useQueryClient();
  const rutinaId = session.data?.rutinaId ?? null;
  const rutinaDiaId = session.data?.rutinaDiaId ?? null;
  const title = useMemo(() => {
    if (!last || !rutinaId) return null;
    const routine = queryClient.getQueryData<Pick<Routine, 'nombre' | 'dias'>>(['routine', rutinaId]);
    const dayName = routine?.dias.find((day) => day.id === rutinaDiaId)?.nombre?.trim();
    const link = queryClient.getQueryData<{ nombre: string | null }>(['workout', last.sessionId, 'routine-link']);
    return dayName || routine?.nombre || link?.nombre || null;
  }, [last, queryClient, rutinaDiaId, rutinaId]);

  if (!last) {
    return (
      <ScrollScreen>
        <ScreenHeader title="Sesión terminada" />
        <Text tone="secondary" variant="body">
          Tu sesión se guardó y sus puntos ya están en tu senda.
        </Text>
        <Button icon="trail-sign-outline" label="Ver mi senda" onPress={() => router.replace('/trayectoria')} />
        <Button icon="arrow-forward" iconPosition="end" label="Seguir" onPress={goToList} variant="ghost" />
      </ScrollScreen>
    );
  }

  const insights = session.data ? sessionInsights(session.data, history.data?.items ?? []) : null;
  const loadingInsights = session.isPending || (history.isPending && !history.isError);
  const volumeKg = insights?.volumeKg ?? last.volumeKg;
  const sets = insights?.sets ?? last.sets;
  const comparison = insights?.comparison ?? null;
  const records = insights?.records ?? [];

  // Secundaria: la acción principal de la pantalla sigue siendo la de abajo.
  const share = () =>
    shareWithBrand(
      sessionShareLines({
        title,
        volumeKg,
        sets,
        duration: last.duration,
        comparison,
        records,
        pointsEarned: last.reward?.pointsEarned ?? null,
      }),
    );

  return (
    <ScrollScreen>
      {loadingInsights && !session.isError ? (
        <Skeleton height={300} />
      ) : (
        <View style={{ gap: spacing.smd }}>
          <SessionHero
            comparison={comparison}
            duration={last.duration}
            exercises={session.data ? session.data.ejercicios.length : null}
            records={records.length}
            sets={sets}
            title={title}
            volumeKg={volumeKg}
          />
          <Button
            accessibilityLabel="Compartir la sesión"
            icon="share-outline"
            label="Compartir"
            onPress={share}
            size="sm"
            style={{ alignSelf: 'flex-start' }}
            testID="session-share"
            variant="secondary"
          />
        </View>
      )}

      {insights ? <SessionRecords records={insights.records} /> : null}

      <View style={{ gap: spacing.lg }}>
        {last.reward ? <SessionSummary onContinue={goToList} session={{ ...last, reward: last.reward }} /> : null}
        {last.programa ? <SessionProgramBlock block={last.programa} workoutId={last.sessionId} /> : null}
        {last.cardio ? <SessionCardioBlock block={last.cardio} /> : null}
        {!last.reward ? <Button icon="arrow-forward" iconPosition="end" label="Seguir" onPress={goToList} /> : null}
      </View>
    </ScrollScreen>
  );
}
