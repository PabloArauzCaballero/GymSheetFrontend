import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import type { MonthColumn, Weekday } from '@gymsheet/hooks';
import type { Routine, RoutineWeek } from '@gymsheet/types';
import { ErrorState, Skeleton } from '@/components/feedback';
import { EnterUp, PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { cardPadding, colors, comfortableTouchTarget, iconSizes, radii, spacing } from '@/theme';
import { MonthView } from '@/features/routine-detail/calendar-views';
import { DayCard } from '@/features/routine-detail/day-cards';
import { orderedDays } from '@/features/routine-detail/routine-plan';

export type ViewMode = 'week' | 'month';

/**
 * Los días de la rutina (rediseño 2026-10-11). Antes había un selector
 * Semana/Mes, flechas de semana, puntos de días y las tarjetas a la vez: cuatro
 * formas de decir lo mismo. Ahora: una tarjeta por día que abre el Día, y el
 * calendario de todas las semanas como extra plegado debajo, para quien quiera
 * ver la progresión o la descarga.
 */
export function WeekSection({
  routine,
  columns,
  weeks,
  total,
  loading,
  error,
  onRetry,
  mode,
  onMode,
  onOpenDay,
}: {
  routine: Routine;
  columns: readonly MonthColumn[];
  weeks: readonly RoutineWeek[];
  total: number;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
  onOpenDay: (diaId: string, semana: number) => void;
}) {
  const days = orderedDays(routine);
  const diaIdOf = (dia: Weekday) => routine.dias.find((day) => day.diaSemana === dia)?.id;
  const monthOpen = mode === 'month';
  const weeksTotal = total || routine.duracionSemanas || 0;
  return (
    <View style={{ gap: spacing.mdl }}>
      <View style={{ gap: spacing.xs }}>
        <Text accessibilityRole="header" variant="title">
          Los días
        </Text>
        <Text tone="muted" variant="subhead">
          Toca un día para ver sus ejercicios.
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        {days.map((day, index) => (
          <EnterUp index={index} key={day.id}>
            <DayCard day={day} number={index + 1} onPress={() => onOpenDay(day.id, 1)} />
          </EnterUp>
        ))}
      </View>

      {weeksTotal > 1 ? (
        <PressableScale
          accessibilityLabel="Vista Mes"
          accessibilityState={{ expanded: monthOpen }}
          haptic="selection"
          onPress={() => onMode(monthOpen ? 'week' : 'month')}
          scaleTo={0.98}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: comfortableTouchTarget + spacing.xs,
            paddingHorizontal: cardPadding,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceLow,
          }}
          testID="toggle-month"
        >
          <Ionicons color={colors.textSecondary} name="calendar-outline" size={iconSizes.md} />
          <Text style={{ flex: 1 }} tone="secondary" variant="subhead">
            {monthOpen ? 'Ocultar el calendario' : `Ver las ${weeksTotal} semanas`}
          </Text>
          <Ionicons color={colors.textMuted} name={monthOpen ? 'chevron-up' : 'chevron-down'} size={iconSizes.md} />
        </PressableScale>
      ) : null}

      {monthOpen ? (
        loading ? (
          <Skeleton height={160} />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : (
          <MonthView
            columns={columns}
            onPickDay={(semana, dia) => {
              const diaId = diaIdOf(dia);
              if (diaId) onOpenDay(diaId, semana);
            }}
            semanas={weeks}
          />
        )
      ) : null}
    </View>
  );
}
