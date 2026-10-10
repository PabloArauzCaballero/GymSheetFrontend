import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { WEEKDAY_INITIALS, WEEKDAY_NAMES, type MonthColumn, type Weekday } from '@gymsheet/hooks';
import type { Routine, RoutineWeek } from '@gymsheet/types';
import { ErrorState, Skeleton } from '@/components/feedback';
import { SegmentLabel, SegmentedPill, PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { WeekDots } from '@/components/week-dots';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import { MonthView } from '@/features/routine-detail/calendar-views';
import { DayCard } from '@/features/routine-detail/day-cards';
import { orderedDays, todayWeekday } from '@/features/routine-detail/routine-plan';

export type ViewMode = 'week' | 'month';
const MODES = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
] as const;

function WeekNav({ number, total, onPrev, onNext }: { number: number; total: number; onPrev: () => void; onNext: () => void }) {
  const arrow = {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <PressableScale accessibilityLabel="Semana anterior" disabled={number <= 1} haptic="selection" onPress={onPrev} scaleTo={0.94} style={arrow} testID="week-prev">
        <Ionicons color={number <= 1 ? colors.textDisabled : colors.text} name="chevron-back" size={iconSizes.md} />
      </PressableScale>
      <Text accessibilityLiveRegion="polite" tabular testID="week-title" tone="secondary" variant="subhead">
        {`Semana ${number}${total ? ` de ${total}` : ''}`}
      </Text>
      <PressableScale accessibilityLabel="Semana siguiente" disabled={number >= total} haptic="selection" onPress={onNext} scaleTo={0.94} style={arrow} testID="week-next">
        <Ionicons color={number >= total ? colors.textDisabled : colors.text} name="chevron-forward" size={iconSizes.md} />
      </PressableScale>
    </View>
  );
}

/**
 * «Tu semana» (C8.3.1): la semana en `WeekDots` y una tarjeta por día que abre
 * la pantalla del Día. El mes queda como vista secundaria, sin recortar nombres.
 */
export function WeekSection({
  routine,
  columns,
  weeks,
  week,
  total,
  loading,
  error,
  onRetry,
  mode,
  onMode,
  onPrev,
  onNext,
  onOpenDay,
}: {
  routine: Routine;
  columns: readonly MonthColumn[];
  weeks: readonly RoutineWeek[];
  week: RoutineWeek | undefined;
  total: number;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenDay: (diaId: string, semana: number) => void;
}) {
  const number = week?.numero ?? 1;
  const days = orderedDays(routine);
  const today = todayWeekday();
  const diaIdOf = (dia: Weekday) => routine.dias.find((day) => day.diaSemana === dia)?.id;
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" variant="title">
          Tu semana
        </Text>
        {mode === 'week' && total > 0 ? <WeekNav number={number} onNext={onNext} onPrev={onPrev} total={total} /> : null}
      </View>
      <SegmentedPill
        itemStyle={{ minHeight: minTouchTarget, flexGrow: 1, minWidth: 96, alignItems: 'center', justifyContent: 'center' }}
        onChange={onMode}
        options={MODES.map((option) => ({ value: option.value, accessibilityLabel: `Vista ${option.label}` }))}
        renderItem={(option, active) => (
          <SegmentLabel
            active={active}
            activeColor={colors.text}
            inactiveColor={colors.textMuted}
            label={MODES.find((m) => m.value === option.value)?.label ?? ''}
            style={{ fontSize: fontSizes.sm, fontWeight: semibold }}
          />
        )}
        style={{ alignSelf: 'stretch', borderRadius: radii.full, backgroundColor: colors.surfaceLow, padding: spacing.xs }}
        value={mode}
      />
      {loading ? (
        <Skeleton height={160} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : mode === 'month' ? (
        <MonthView
          columns={columns}
          onPickDay={(semana, dia) => {
            const diaId = diaIdOf(dia);
            if (diaId) onOpenDay(diaId, semana);
          }}
          semanas={weeks}
        />
      ) : (
        <View style={{ gap: spacing.smd }}>
          {week?.esDescarga ? (
            <Text strong tone="warning" variant="footnote">
              Semana de descarga · menos volumen y carga
            </Text>
          ) : null}
          <WeekDots
            days={columns.map((column) => ({
              key: String(column.dia),
              initial: WEEKDAY_INITIALS[column.dia],
              label: column.entrena
                ? `${WEEKDAY_NAMES[column.dia]}${column.nombre ? `, ${column.nombre}` : ''}`
                : `${WEEKDAY_NAMES[column.dia]}, descanso`,
              state: column.entrena ? 'training' : 'rest',
              today: column.dia === today,
            }))}
            onPress={(key) => {
              const diaId = diaIdOf(Number(key) as Weekday);
              if (diaId) onOpenDay(diaId, number);
            }}
          />
          {days.map((day, index) => (
            <DayCard day={day} key={day.id} number={index + 1} onPress={() => onOpenDay(day.id, number)} />
          ))}
        </View>
      )}
    </View>
  );
}
