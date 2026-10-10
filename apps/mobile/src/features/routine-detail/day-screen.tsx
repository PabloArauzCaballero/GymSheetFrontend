import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useState } from 'react';
import { View } from 'react-native';
import { exerciseGroupLabelEs, muscleLabelEs } from '@gymsheet/domain';
import {
  dayView,
  estimateDayMinutes,
  transitionLabel,
  type DayBlock,
  type DayExerciseView,
} from '@gymsheet/hooks';
import type { Routine, RoutineDay } from '@gymsheet/types';
import { routineBuilderService, routineService } from '@/api/services';
import { ExerciseRow } from '@/components/exercise-row';
import { FactChips } from '@/components/fact-chips';
import { EmptyState, ErrorState, RowsSkeleton, Skeleton } from '@/components/feedback';
import { GroupBlock } from '@/components/group-block';
import { ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { RestPill } from '@/components/rest-pill';
import { StickyFooter, StickyFooterSpacer } from '@/components/sticky-footer';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, radii, shadows, spacing } from '@/theme';
import { dayKicker, dayTitle } from '@/features/routine-detail/day-cards';
import { MoreSheet } from '@/features/routine-detail/more-sheet';
import { ReportSheet, type ReportTarget } from '@/features/routine-detail/report-sheet';
import { dayNumber, orderedDays } from '@/features/routine-detail/routine-plan';
import { useStartRoutine } from '@/features/routine-detail/use-start-routine';

/** Músculo de un ejercicio del día, en español («Pectorales», no «pectorals»). */
function muscleOf(item: Pick<DayExerciseView, 'targetMuscle' | 'grupoMuscular' | 'bodyPart'>): string {
  return (
    muscleLabelEs(item.targetMuscle) ||
    exerciseGroupLabelEs(item.grupoMuscular) ||
    exerciseGroupLabelEs(item.bodyPart)
  );
}

function musclesOf(items: readonly DayExerciseView[], limit = 4): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const label = muscleOf(item);
    if (label) seen.add(label);
  }
  return [...seen].slice(0, limit);
}

/** El siguiente día con ejercicios después de `day` (dando la vuelta a la semana). */
function nextTrainingDay(routine: Pick<Routine, 'dias'>, day: RoutineDay): RoutineDay | null {
  const days = orderedDays(routine);
  const index = days.findIndex((candidate) => candidate.id === day.id);
  for (let step = 1; step <= days.length; step += 1) {
    const candidate = days[(index + step) % days.length];
    if (candidate && candidate.id !== day.id && candidate.ejercicios.length > 0) return candidate;
  }
  return null;
}

function blockName(block: DayBlock<DayExerciseView>): string {
  return `${block.kind === 'circuito' ? 'Circuito' : 'Superserie'} ${block.label ?? ''}`.trim();
}

/**
 * El Día en pantalla completa (C3.c, C8.3.2): «Semana 2 de 8 · Lunes · Día 1»,
 * el título, los músculos en español, el resumen con «≈55 min» (el único dato
 * en acento) y los bloques del día: ejercicios sueltos (`ExerciseRow`) con el
 * descanso entre ellos (`RestPill`), y superseries o circuitos (`GroupBlock`)
 * con A1/A2, la transición y el descanso tras la vuelta una sola vez.
 * «Entrenar este día» va fijo abajo.
 *
 * Lista con `map` dentro del scroll y no FlashList: un día tiene como mucho
 * una veintena de filas, y virtualizar dentro de `ScrollScreen` (que da las
 * áreas seguras, el pie fijo y el gesto de recargar) no ahorra nada.
 */
export function DayScreen() {
  const { id, diaId, semana } = useLocalSearchParams<{ id: string; diaId: string; semana?: string }>();
  const router = useRouter();
  const weekNumber = Math.max(1, Number(semana) || 1);
  const start = useStartRoutine(id);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [menuFor, setMenuFor] = useState<DayExerciseView | null>(null);

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
        <View style={{ gap: spacing.smd }}>
          <Skeleton height={18} />
          <Skeleton height={40} />
        </View>
        <Skeleton height={64} />
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

  const items = view.ejercicios;
  const minutes = estimateDayMinutes(items);
  const muscles = musclesOf(items);
  const groups = view.bloques.filter((block) => block.kind !== 'single').length;
  const kicker = [
    `Semana ${weekNumber}${total ? ` de ${total}` : ''}`,
    dayKicker(base, dayNumber(data, base.id)),
  ].join(' · ');
  const openDay = (day: RoutineDay) =>
    router.replace({ pathname: '/routines/[id]/dia/[diaId]', params: { id: data.id, diaId: day.id, semana: String(weekNumber) } });

  const header = (
    <View style={{ gap: spacing.smd }}>
      <Text tabular testID="day-kicker" tone="muted" variant="footnote">
        {kicker}
      </Text>
      <Text accessibilityRole="header" numberOfLines={3} testID="day-title" variant="display">
        {dayTitle(base)}
      </Text>
      {muscles.length > 0 || week?.esDescarga ? (
        <FactChips
          facts={[
            ...(week?.esDescarga ? [{ key: 'descarga', label: 'Descarga', icon: 'leaf-outline' as const }] : []),
            ...muscles.map((label) => ({ key: label, label })),
          ]}
        />
      ) : null}
    </View>
  );

  // Día de descanso: un día de la rutina sin ejercicios.
  if (items.length === 0) {
    const next = nextTrainingDay(data, base);
    return (
      <ScrollScreen>
        <BackLink />
        {header}
        <EmptyState
          icon="moon-outline"
          message={
            next
              ? `Lo siguiente: ${dayKicker(next, dayNumber(data, next.id))} · ${dayTitle(next)}.`
              : 'Recuperar también es parte del plan.'
          }
          title="Hoy toca descansar"
        >
          {next ? <Button label="Ver el siguiente día" onPress={() => openDay(next)} variant="secondary" /> : null}
        </EmptyState>
      </ScrollScreen>
    );
  }

  const canReport = !data.esMia;
  const rowFor = (item: DayExerciseView, grouped: boolean) => (
    <ExerciseRow
      badge={grouped ? (item.posicion ?? undefined) : undefined}
      caption={muscleOf(item) || null}
      exercise={{ media: item.media, nombre: item.nombre, grupoMuscular: item.grupoMuscular ?? '' }}
      flag={item.ajustado ? 'Ajustado por la descarga' : undefined}
      grouped={grouped}
      key={item.routineExerciseId}
      moreLabel={`Más opciones de ${item.nombre}`}
      name={item.nombre}
      note={item.nota}
      onMore={canReport && item.esPrivado ? () => setMenuFor(item) : undefined}
      onPress={
        item.ejercicioId
          ? () => router.push({ pathname: '/routines/ejercicio/[id]', params: { id: item.ejercicioId } })
          : undefined
      }
      prescription={{
        series: item.series,
        repsMin: item.repsMin,
        repsMax: item.repsMax,
        duracionSeg: item.duracionSeg,
        pesoKg: item.pesoObjetivoKg,
        rir: item.rirObjetivo,
      }}
      testID={`day-exercise-${item.routineExerciseId}`}
    />
  );

  return (
    <ScrollScreen
      onRefresh={() => void routine.refetch()}
      overlay={
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
      }
      refreshing={routine.isRefetching}
    >
      <BackLink />
      {header}

      <View
        accessibilityLabel={`Unos ${minutes} minutos, ${items.length} ejercicios, ${view.totalSeries} series${groups ? `, ${groups} ${groups === 1 ? 'bloque' : 'bloques'}` : ''}`}
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
        testID="day-summary"
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
          <Text strong variant="subhead">{view.totalSeries}</Text>
          {' series'}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        {view.bloques.map((block, index) => {
          const key = block.items.map((item) => item.routineExerciseId).join('+');
          const last = index === view.bloques.length - 1;
          if (block.kind === 'single') {
            const item = block.items[0];
            if (!item) return null;
            return (
              <Fragment key={key}>
                {rowFor(item, false)}
                {!last && block.descansoTrasVueltaSeg ? <RestPill seconds={block.descansoTrasVueltaSeg} /> : null}
              </Fragment>
            );
          }
          return (
            <GroupBlock
              key={key}
              label={blockName(block)}
              restSeconds={block.descansoTrasVueltaSeg}
              rounds={block.rondas}
              testID={`day-block-${block.label}`}
              transition={transitionLabel(block.descansoEntreSeg)}
            >
              {block.items.map((item) => rowFor(item, true))}
            </GroupBlock>
          );
        })}
      </View>

      <StickyFooterSpacer />
      <MoreSheet
        actions={
          menuFor
            ? [
                {
                  key: 'report',
                  label: 'Denunciar ejercicio',
                  icon: 'flag-outline',
                  destructive: true,
                  onPress: () => setReport({ kind: 'EXERCISE', id: menuFor.ejercicioId, label: menuFor.nombre }),
                },
              ]
            : []
        }
        onClose={() => setMenuFor(null)}
        title={menuFor?.nombre ?? ''}
        visible={menuFor !== null}
      />
      <ReportSheet onClose={() => setReport(null)} target={report} />
    </ScrollScreen>
  );
}
