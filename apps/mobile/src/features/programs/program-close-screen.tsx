import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { multiplierLabel } from '@gymsheet/hooks';
import type { CloseAction } from '@gymsheet/types';
import { ApiError } from '@gymsheet/api-client';
import { programService } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card, ScreenHeader, ScrollScreen, StatTile } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { GoalProgress } from '@/features/programs/goal-progress';
import { notify } from '@/notifications';
import { colors, fontSizes, spacing } from '@/theme';

/**
 * Cierre del programa (RF-19): resumen (semanas cumplidas, marcas) y tres salidas. Nada se
 * repite solo (D6): «Repetir con las cargas nuevas», «Elegir otra rutina» o «Apagar».
 */
export function ProgramCloseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const progress = useQuery({ queryKey: ['programs', id, 'progress'], queryFn: () => programService.progress(id), enabled: Boolean(id) });

  const close = useMutation({
    mutationFn: (action: CloseAction) => programService.close(id, action),
    onSuccess: async (_result, action) => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] });
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      if (action === 'REPEAT') notify.success('Programa nuevo con tus cargas actuales.');
      else if (action === 'STOP') notify.success('Programa apagado. Tu cardio sigue activo.');
      router.replace('/routines');
    },
    onError: (error: Error) =>
      notify.error(error instanceof ApiError && error.kind === 'validation' ? error.message : error),
  });

  if (progress.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={140} />
      </ScrollScreen>
    );
  }
  if (progress.isError) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />
      </ScrollScreen>
    );
  }
  const { programa, semanas } = progress.data;
  const done = semanas.filter((week) => week.cumplida === true).length;
  const reached = programa.metas.filter((lift) => lift.alcanzadaEn !== null).length;
  const goals = programa.metas.filter((lift) => lift.marcaMetaKg !== null);

  const choose = (action: CloseAction) => {
    if (action === 'CHOOSE_OTHER') {
      close.mutate(action, { onSuccess: () => router.replace('/routines') });
      return;
    }
    close.mutate(action);
  };

  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader subtitle="Esto fue tu programa." title="¿Qué sigue?" />
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.md }}>{programa.rutinaNombre ?? 'Programa'}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <StatTile label="Semanas cumplidas" value={`${done} / ${semanas.length}`} />
        <StatTile label="Metas logradas" value={`${reached}`} />
        <StatTile label="Multiplicador" value={multiplierLabel(programa.multiplicador)} />
      </View>
      {goals.length > 0 ? (
        <Card>
          <View style={{ gap: spacing.md }}>
            {goals.map((lift) => (
              <GoalProgress key={lift.ejercicioId} lift={lift} />
            ))}
          </View>
        </Card>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Button label="Repetir con las cargas nuevas" loading={close.isPending} onPress={() => choose('REPEAT')} />
        <Button label="Elegir otra rutina" onPress={() => choose('CHOOSE_OTHER')} variant="ghost" />
        <Button label="Apagar" onPress={() => choose('STOP')} variant="ghost" />
      </View>
    </ScrollScreen>
  );
}
