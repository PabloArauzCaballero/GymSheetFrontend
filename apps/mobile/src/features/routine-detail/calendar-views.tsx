import { View } from 'react-native';
import { WEEKDAYS, WEEKDAY_INITIALS, WEEKDAY_NAMES, countLabel, type MonthColumn, type Weekday } from '@gymsheet/hooks';
import type { RoutineWeek } from '@gymsheet/types';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, minTouchTarget, radii, spacing } from '@/theme';

/**
 * Vista Mes: una fila por semana y una celda por día con su inicial; los
 * nombres completos van una vez en la leyenda de abajo, en vez de recortarse a
 * 3 letras dentro de celdas de 40 pt. La descarga lleva la palabra «Descarga»
 * (el estado nunca depende solo del color) y ninguna celda usa `opacity`.
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
  const named = columns.filter((column) => column.entrena);
  return (
    <View accessibilityLabel="Vista Mes" style={{ gap: spacing.xs }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', gap: spacing.xs }}
      >
        <View style={{ width: 72 }} />
        {WEEKDAYS.map((dia) => (
          <Text key={dia} style={{ flex: 1, textAlign: 'center' }} tone="muted" variant="caption">
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
            paddingVertical: spacing.xxs,
            borderRadius: radii.md,
            backgroundColor: week.esDescarga ? colors.surfaceHigh : colors.surfaceLow,
          }}
          testID={`month-week-${week.numero}`}
        >
          <View style={{ width: 72, paddingLeft: spacing.sm }}>
            <Text strong tabular variant="subhead">{`Sem. ${week.numero}`}</Text>
            {week.esDescarga ? (
              <Text strong tone="warning" variant="caption">
                Descarga
              </Text>
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
                  backgroundColor: column.entrena ? colors.surfaceHighest : 'transparent',
                }}
                testID={`month-cell-${week.numero}-${column.dia}`}
              >
                <Text strong={column.entrena} tone={column.entrena ? 'default' : 'muted'} variant="footnote">
                  {column.entrena ? WEEKDAY_INITIALS[column.dia] : '·'}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      ))}
      {named.length > 0 ? (
        <View style={{ gap: spacing.xxs, paddingTop: spacing.sm }}>
          {named.map((column) => (
            <Text key={column.dia} tone="secondary" variant="footnote">
              <Text strong variant="footnote">{WEEKDAY_NAMES[column.dia]}</Text>
              {` · ${column.nombre ?? 'Entreno'} · ${countLabel(column.ejercicios)}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
