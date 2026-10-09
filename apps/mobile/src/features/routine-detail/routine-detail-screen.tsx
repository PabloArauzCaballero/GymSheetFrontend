import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '@gymsheet/api-client';
import {
  dayView,
  isAnyDayRoutine,
  routineColumns,
  type Weekday,
} from '@gymsheet/hooks';
import { routineBuilderService, routineService } from '@/api/services';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Card, ScrollScreen, Section } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { SegmentLabel, SegmentedPill } from '@/components/motion';
import { Button } from '@/components/ui';
import { ScheduleRoutine } from '@/components/schedule-routine';
import { DaySheet } from '@/features/routine-detail/day-sheet';
import { DetailHeader } from '@/features/routine-detail/detail-header';
import { MonthView, WeekView } from '@/features/routine-detail/calendar-views';
import { useStartRoutine } from '@/features/routine-detail/use-start-routine';
import { accentContrast, colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

type ViewMode = 'week' | 'month';
const MODES = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
] as const;

/** Detalle de rutina con la bandera `routinesV2`: cabecera, vista Semana/Mes y hoja del día (RF-02). */
export function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>('week');
  const [weekNumber, setWeekNumber] = useState(1);
  const [picked, setPicked] = useState<{ semana: number; diaId: string } | null>(null);
  const start = useStartRoutine(id);

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

  const data = routine.data;
  const columns = useMemo(() => (data ? routineColumns(data) : []), [data]);
  const weeks = calendar.data?.semanas ?? [];
  const total = calendar.data?.duracionSemanas ?? weeks.length;
  const week = weeks.find((candidate) => candidate.numero === weekNumber) ?? weeks[0];

  if (routine.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={110} />
        <Skeleton height={180} />
      </ScrollScreen>
    );
  }
  if (routine.isError || !data) {
    const pendingShare = routine.error instanceof ApiError && routine.error.code === 'SHARE_PENDING';
    return (
      <ScrollScreen>
        <BackLink />
        {pendingShare ? (
          <EmptyState
            icon="mail-unread-outline"
            message="Acepta la invitación desde Rutinas › Mías › Compartidas conmigo para ver los ejercicios."
            title="Aún no aceptaste esta rutina"
          >
            <Button label="Ir a mis invitaciones" onPress={() => router.replace('/routines')} />
          </EmptyState>
        ) : (
          <ErrorState error={routine.error} onRetry={() => void routine.refetch()} />
        )}
      </ScrollScreen>
    );
  }

  const anyDay = isAnyDayRoutine(data);
  const diaIdOf = (dia: Weekday) => data.dias.find((day) => day.diaSemana === dia)?.id;
  const sheetWeek = weeks.find((candidate) => candidate.numero === picked?.semana);
  const sheetDay = picked ? dayView(data, sheetWeek, picked.diaId) : null;

  return (
    <ScrollScreen onRefresh={() => void routine.refetch()} refreshing={routine.isRefetching}>
      <BackLink />
      <DetailHeader routine={data} />

      <Button
        label="Empezar rutina"
        loading={start.isPending}
        onPress={() => start.mutate(undefined)}
      />

      <Section icon="calendar-outline" index={0} title="Plan">
        {anyDay ? (
          <Card
            accessibilityLabel="Rutina de un día, cualquier día. Abrir"
            onPress={() => setPicked({ semana: 1, diaId: data.dias[0]?.id ?? '' })}
          >
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
              Rutina de un día (cualquier día)
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
              Se entrena cuando quieras. Toca para ver los ejercicios.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            <SegmentedPill
              itemStyle={{
                minHeight: minTouchTarget,
                flexGrow: 1,
                minWidth: 96,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onChange={setMode}
              options={MODES.map((option) => ({
                value: option.value,
                accessibilityLabel: `Vista ${option.label}`,
              }))}
              pillColor={colors.volt}
              renderItem={(option, active) => (
                <SegmentLabel
                  active={active}
                  activeColor={accentContrast()}
                  inactiveColor={colors.textMuted}
                  label={MODES.find((m) => m.value === option.value)?.label ?? ''}
                  style={{ fontSize: fontSizes.sm, fontWeight: semibold }}
                />
              )}
              style={{
                alignSelf: 'stretch',
                borderRadius: radii.full,
                backgroundColor: colors.surfaceLow,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                padding: 4,
              }}
              value={mode}
            />
            {calendar.isPending ? (
              <Skeleton height={160} />
            ) : calendar.isError ? (
              <ErrorState error={calendar.error} onRetry={() => void calendar.refetch()} />
            ) : mode === 'week' ? (
              <WeekView
                columns={columns}
                onNext={() => setWeekNumber((n) => Math.min(total, n + 1))}
                onPickDay={(dia) => {
                  const diaId = diaIdOf(dia);
                  if (diaId) setPicked({ semana: week?.numero ?? 1, diaId });
                }}
                onPrev={() => setWeekNumber((n) => Math.max(1, n - 1))}
                total={total}
                week={week}
              />
            ) : (
              <MonthView
                columns={columns}
                onPickDay={(semana, dia) => {
                  const diaId = diaIdOf(dia);
                  if (diaId) setPicked({ semana, diaId });
                }}
                semanas={calendar.data?.semanas ?? []}
              />
            )}
          </View>
        )}
      </Section>

      {data.esMia ? (
        <Section index={1} title="Programar">
          <ScheduleRoutine routineId={data.id} />
        </Section>
      ) : null}

      <DaySheet
        day={sheetDay}
        isDeload={sheetWeek?.esDescarga ?? false}
        onClose={() => setPicked(null)}
        onTrain={() => {
          const diaId = picked?.diaId;
          setPicked(null);
          start.mutate(diaId);
        }}
        training={start.isPending}
        visible={picked !== null}
        weekNumber={picked?.semana ?? 1}
      />
    </ScrollScreen>
  );
}
