import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useState } from 'react';
import { View } from 'react-native';
import { dayView } from '@gymsheet/hooks';
import { routineBuilderService, routineService } from '@/api/services';
import { ExerciseRow } from '@/components/exercise-row';
import { FactChips } from '@/components/fact-chips';
import { EmptyState, ErrorState, RowsSkeleton, Skeleton } from '@/components/feedback';
import { ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { RestPill } from '@/components/rest-pill';
import { StickyFooter, StickyFooterSpacer } from '@/components/sticky-footer';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, radii, shadows, spacing } from '@/theme';
import { dayKicker, dayTitle } from '@/features/routine-detail/day-cards';
import { ReportSheet, type ReportTarget } from '@/features/routine-detail/report-sheet';
import { dayMuscles, dayNumber, estimateMinutes, exerciseMuscle } from '@/features/routine-detail/routine-plan';
import { useStartRoutine } from '@/features/routine-detail/use-start-routine';

/**
 * El Día en pantalla completa (C8.3.2): «Semana 2 de 8 · Lunes · Día 1», el
 * título, los músculos en español, el resumen con «≈55 min» (el único dato en
 * acento), la lista de ejercicios con el descanso entre ellos y «Entrenar este
 * día» fijo abajo. Las superseries (`GroupBlock`) llegan con el modelo de C3.
 */
export function DayScreen() {
  const { id, diaId, semana } = useLocalSearchParams<{ id: string; diaId: string; semana?: string }>();
  const router = useRouter();
  const weekNumber = Math.max(1, Number(semana) || 1);
  const start = useStartRoutine(id);
  const [report, setReport] = useState<ReportTarget | null>(null);

  const routine = useQuery({
    queryKey: ['routine', id],
    queryFn: () => routineService.get(id),
    enabled: Boolean(id),
  });
  const calendar = useQuery({
    queryKey: ['routine', id, 'calendar'],
    queryFn: () => routineBuilderService.calendar(id),
    enabled: Boolean(id) && routine.isSuccess,
  });

  if (routine.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={96} />
        <RowsSkeleton rows={4} />
      </ScrollScreen>
    );
  }
  if (routine.isError || !routine.data) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={routine.error} onRetry={() => void routine.refetch()} />
      </ScrollScreen>
    );
  }

  const data = routine.data;
  const base = data.dias.find((day) => day.id === diaId);
  const weeks = calendar.data?.semanas ?? [];
  const week = weeks.find((candidate) => candidate.numero === weekNumber);
  const total = calendar.data?.duracionSemanas ?? weeks.length;
  const view = dayView(data, week, diaId);

  if (!base || !view) {
    return (
      <ScrollScreen>
        <BackLink />
        <EmptyState icon="calendar-outline" message="Puede que la rutina haya cambiado." title="Este día ya no existe">
          <Button label="Volver a la rutina" onPress={() => router.back()} variant="secondary" />
        </EmptyState>
      </ScrollScreen>
    );
  }

  const byId = new Map(base.ejercicios.map((item) => [item.id, item]));
  const items = view.ejercicios.map((item) => ({ view: item, base: byId.get(item.routineExerciseId) }));
  const minutes = estimateMinutes(
    items.map(({ view: v, base: b }) => ({ series: v.series, descansoSeg: b?.descansoSeg ?? null })),
  );
  const sets = items.reduce((sum, { view: v }) => sum + v.series, 0);
  const muscles = dayMuscles(base);
  const kicker = [
    `Semana ${weekNumber}${total ? ` de ${total}` : ''}`,
    dayKicker(base, dayNumber(data, base.id)),
    week?.esDescarga ? 'Descarga' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const reportable = !data.esMia ? items.filter(({ view: v }) => v.esPrivado) : [];

  return (
    <ScrollScreen
      onRefresh={() => void routine.refetch()}
      overlay={
        items.length > 0 ? (
          <StickyFooter>
            <Button
              icon="play"
              label="Entrenar este día"
              loading={start.isPending}
              onPress={() => start.mutate(base.id)}
              size="lg"
              style={{ flex: 1 }}
              testID="train-day"
            />
          </StickyFooter>
        ) : undefined
      }
      refreshing={routine.isRefetching}
    >
      <BackLink />

      <View style={{ gap: spacing.smd }}>
        <Text tabular testID="day-kicker" tone="muted" variant="footnote">
          {kicker}
        </Text>
        <Text accessibilityRole="header" numberOfLines={3} testID="day-title" variant="display">
          {dayTitle(base)}
        </Text>
        {muscles.length > 0 ? <FactChips facts={muscles.map((label) => ({ key: label, label }))} /> : null}
      </View>

      {items.length > 0 ? (
        <View
          accessibilityLabel={`Unos ${minutes} minutos, ${items.length} ejercicios, ${sets} series`}
          accessible
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: spacing.smd,
            paddingHorizontal: spacing.mdl,
            paddingVertical: spacing.md,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceLow,
            boxShadow: shadows.e1,
          }}
        >
          <Text style={{ color: colors.accentInk }} variant="numeric">
            {`≈${minutes}`}
            <Text tone="secondary" variant="subhead">
              {' min'}
            </Text>
          </Text>
          <Text style={{ flex: 1 }} tabular tone="secondary" variant="subhead">
            <Text strong variant="subhead">{items.length}</Text>
            {` ${items.length === 1 ? 'ejercicio' : 'ejercicios'} · `}
            <Text strong variant="subhead">{sets}</Text>
            {' series'}
          </Text>
        </View>
      ) : (
        <EmptyState icon="barbell-outline" message="Añade ejercicios desde el editor de la rutina." title="Este día no tiene ejercicios" />
      )}

      <View style={{ gap: spacing.sm }}>
        {items.map(({ view: item, base: planned }, index) => (
          <Fragment key={item.routineExerciseId}>
            <ExerciseRow
              badge={String(index + 1)}
              caption={planned ? exerciseMuscle(planned) : null}
              exercise={planned?.ejercicio ?? null}
              flag={item.ajustado ? 'Ajustado por la descarga' : undefined}
              name={item.nombre}
              note={planned?.nota}
              onPress={
                item.ejercicioId
                  ? () => router.push({ pathname: '/routines/ejercicio/[id]', params: { id: item.ejercicioId } })
                  : undefined
              }
              prescription={{
                series: item.series,
                repsMin: item.repsMin,
                repsMax: item.repsMax,
                pesoKg: item.pesoObjetivoKg,
                rir: planned?.rirObjetivo ?? null,
              }}
              testID={`day-exercise-${item.routineExerciseId}`}
            />
            {index < items.length - 1 && planned?.descansoSeg ? <RestPill seconds={planned.descansoSeg} /> : null}
          </Fragment>
        ))}
      </View>

      {reportable.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {reportable.map(({ view: item }) => (
            <Button
              key={item.routineExerciseId}
              label={`Denunciar «${item.nombre}»`}
              onPress={() => setReport({ kind: 'EXERCISE', id: item.ejercicioId, label: item.nombre })}
              size="sm"
              variant="ghost"
            />
          ))}
        </View>
      ) : null}

      <StickyFooterSpacer />
      <ReportSheet onClose={() => setReport(null)} target={report} />
    </ScrollScreen>
  );
}
