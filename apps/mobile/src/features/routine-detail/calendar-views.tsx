import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import {
  WEEKDAYS,
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
  countLabel,
  type MonthColumn,
  type Weekday,
} from '@gymsheet/hooks';
import type { RoutineWeek } from '@gymsheet/types';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const cellName = (column: MonthColumn): string =>
  column.entrena ? (column.nombre ? column.nombre.slice(0, 3) : '•') : '';

/** Vista Semana: siete columnas, cada día con su nombre y su número de ejercicios. */
export function WeekView({
  week,
  total,
  columns,
  onPrev,
  onNext,
  onPickDay,
}: {
  week: RoutineWeek | undefined;
  total: number;
  columns: readonly MonthColumn[];
  onPrev: () => void;
  onNext: () => void;
  onPickDay: (dia: Weekday) => void;
}) {
  const number = week?.numero ?? 1;
  return (
    <View accessibilityLabel="Vista Semana" style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <PressableScale
          accessibilityLabel="Semana anterior"
          disabled={number <= 1}
          haptic="selection"
          onPress={onPrev}
          style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center', opacity: number <= 1 ? 0.35 : 1 }}
          testID="week-prev"
        >
          <Ionicons color={colors.text} name="chevron-back" size={iconSizes.md} />
        </PressableScale>
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}
            testID="week-title"
          >
            {`Semana ${number}${total ? ` de ${total}` : ''}`}
          </Text>
          {week?.esDescarga ? (
            <Text style={{ color: colors.warning, fontSize: fontSizes.xs, fontWeight: semibold }}>
              Descarga · menos volumen y carga
            </Text>
          ) : null}
        </View>
        <PressableScale
          accessibilityLabel="Semana siguiente"
          disabled={number >= total}
          haptic="selection"
          onPress={onNext}
          style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center', opacity: number >= total ? 0.35 : 1 }}
          testID="week-next"
        >
          <Ionicons color={colors.text} name="chevron-forward" size={iconSizes.md} />
        </PressableScale>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {columns.map((column) => (
          <PressableScale
            accessibilityLabel={
              column.entrena
                ? `${WEEKDAY_NAMES[column.dia]}${column.nombre ? `, ${column.nombre}` : ''}, ${countLabel(column.ejercicios)}`
                : `${WEEKDAY_NAMES[column.dia]}, descanso`
            }
            disabled={!column.entrena}
            haptic="selection"
            key={column.dia}
            onPress={() => onPickDay(column.dia)}
            scaleTo={0.94}
            style={{
              flex: 1,
              minHeight: 92,
              alignItems: 'center',
              gap: 4,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: column.entrena ? `${colors.volt}66` : colors.borderSubtle,
              backgroundColor: column.entrena ? colors.surfaceLow : 'transparent',
              paddingVertical: spacing.sm,
              opacity: column.entrena ? 1 : 0.45,
            }}
            testID={`week-day-${column.dia}`}
          >
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: semibold }}>
              {WEEKDAY_INITIALS[column.dia]}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.xs }}>
              {column.entrena ? column.nombre ?? 'Día' : '—'}
            </Text>
            <Text style={{ color: column.entrena ? colors.volt : colors.textMuted, fontSize: fontSizes.lg, fontWeight: semibold }}>
              {column.entrena ? column.ejercicios : ''}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/**
 * Vista Mes: una fila por semana y una celda por día. La descarga se atenúa y
 * lleva la etiqueta «Descarga» (el estado nunca depende solo del color). Cada
 * celda es un botón con la semana, el día, el nombre y el número de ejercicios.
 */
export function MonthView({
  semanas,
  columns,
  onPickDay,
}: {
  semanas: readonly RoutineWeek[];
  columns: readonly MonthColumn[];
  onPickDay: (semana: number, dia: Weekday) => void;
}) {
  return (
    <View accessibilityLabel="Vista Mes" style={{ gap: spacing.xs }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', gap: spacing.xs }}
      >
        <View style={{ width: 44 }} />
        {WEEKDAYS.map((dia) => (
          <Text
            key={dia}
            style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: semibold }}
          >
            {WEEKDAY_INITIALS[dia]}
          </Text>
        ))}
      </View>
      {semanas.map((week) => (
        <View
          key={week.numero}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            borderRadius: radii.md,
            backgroundColor: week.esDescarga ? colors.surfaceHigh : colors.surfaceLow,
            opacity: week.esDescarga ? 0.8 : 1,
          }}
          testID={`month-week-${week.numero}`}
        >
          <View style={{ width: 44, alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
              {`S${week.numero}`}
            </Text>
            {week.esDescarga ? (
              <Text style={{ color: colors.warning, fontSize: 9, fontWeight: semibold }}>Descarga</Text>
            ) : null}
          </View>
          {columns.map((column) => {
            const name = column.nombre ? `, ${column.nombre}` : '';
            return (
              <PressableScale
                accessibilityLabel={
                  column.entrena
                    ? `Semana ${week.numero}${week.esDescarga ? ' de descarga' : ''}, ${WEEKDAY_NAMES[column.dia].toLowerCase()}${name}, ${countLabel(column.ejercicios)}`
                    : `Semana ${week.numero}, ${WEEKDAY_NAMES[column.dia].toLowerCase()}, descanso`
                }
                disabled={!column.entrena}
                haptic="selection"
                key={column.dia}
                onPress={() => onPickDay(week.numero, column.dia)}
                scaleTo={0.92}
                style={{
                  flex: 1,
                  minHeight: minTouchTarget,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.sm,
                  backgroundColor: column.entrena ? `${colors.volt}22` : 'transparent',
                }}
                testID={`month-cell-${week.numero}-${column.dia}`}
              >
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.xs }}>
                  {cellName(column)}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}
