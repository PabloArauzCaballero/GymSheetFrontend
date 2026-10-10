import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { multiplierLabel, weekLabel } from '@gymsheet/hooks';
import { confirm } from '@gymsheet/notifications';
import { programService } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Badge, Card, ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { GoalProgress } from '@/features/programs/goal-progress';
import { MODE_BADGE } from '@/features/programs/labels';
import { isProgramOver } from '@/features/programs/program-card';
import { notify } from '@/notifications';
import { colors, fontSizes, semibold, spacing } from '@/theme';

/** Progreso del programa (RF-14..16): semanas cumplidas, metas con su barra, detener y cerrar. */
export function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const progress = useQuery({ queryKey: ['programs', id, 'progress'], queryFn: () => programService.progress(id), enabled: Boolean(id) });

  const stop = useMutation({
    mutationFn: () => programService.stop(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] });
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      notify.success('Programa detenido.');
      router.replace('/routines');
    },
    onError: (error: Error) => notify.error(error),
  });

  if (progress.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={100} />
        <Skeleton height={160} />
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
  const over = isProgramOver(programa);
  const goals = programa.metas.filter((lift) => lift.marcaMetaKg !== null);

  const onStop = async () => {
    const result = await confirm({
      title: 'Detener programa',
      message: 'Dejarás de ver el bono y las cargas sugeridas. Tu rutina se conserva.',
      confirmLabel: 'Detener',
      cancelLabel: 'Seguir',
      severity: 'danger',
    });
    if (result.confirmed) stop.mutate();
  };

  return (
    <ScrollScreen onRefresh={() => void progress.refetch()} refreshing={progress.isRefetching}>
      <BackLink />
      <ScreenHeader detail subtitle={weekLabel(programa)} title={programa.rutinaNombre ?? 'Programa'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Badge label={MODE_BADGE[programa.modo] ?? programa.modo} tone="info" />
        {programa.esDescarga ? <Badge label="Semana de descarga" tone="warning" /> : null}
        {programa.multiplicador > 1 ? <Badge label={`Multiplicador ${multiplierLabel(programa.multiplicador)}`} tone="success" /> : null}
      </View>

      {goals.length > 0 ? (
        <Section icon="trophy-outline" index={0} title="Tus metas">
          <Card>
            <View style={{ gap: spacing.md }}>
              {goals.map((lift) => (
                <GoalProgress key={lift.ejercicioId} lift={lift} />
              ))}
            </View>
          </Card>
        </Section>
      ) : null}

      <Section icon="calendar-outline" index={1} title="Semanas">
        <Card list>
          {semanas.map((week) => (
            <View
              accessibilityLabel={`Semana ${week.numero}${week.esDescarga ? ', descarga' : ''}. ${week.sesionesHechas} de ${week.sesionesPlan} sesiones. ${week.cumplida === true ? 'Cumplida' : week.cumplida === false ? 'No cumplida' : 'Pendiente'}`}
              key={week.numero}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}
              testID={`program-week-${week.numero}`}
            >
              <Text style={{ width: 36, color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>{`S${week.numero}`}</Text>
              <Text style={{ flex: 1, color: colors.textMuted, fontSize: fontSizes.sm }}>
                {week.sesionesHechas} / {week.sesionesPlan} sesiones{week.esDescarga ? ' · Descarga' : ''}
              </Text>
              <Text style={{ color: week.cumplida === true ? colors.success : week.cumplida === false ? colors.danger : colors.textMuted, fontSize: fontSizes.sm, fontWeight: semibold }}>
                {week.cumplida === true ? '✓ Cumplida' : week.cumplida === false ? '✗ Sin cumplir' : '—'}
              </Text>
            </View>
          ))}
        </Card>
      </Section>

      <View style={{ gap: spacing.sm }}>
        {over ? (
          <Button label="Decidir qué sigue" onPress={() => router.push({ pathname: '/routines/program/close/[id]', params: { id } })} />
        ) : null}
        <Button label="Detener programa" loading={stop.isPending} onPress={() => void onStop()} variant="danger" />
      </View>
    </ScrollScreen>
  );
}
