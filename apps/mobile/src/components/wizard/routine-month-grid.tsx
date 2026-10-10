import { Text, View } from 'react-native';
import {
  WEEKDAYS,
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
  countLabel,
  type MonthColumn,
  type PlannedWeek,
} from '@gymsheet/hooks';
import { PressableScale } from '@/components/motion';
import { alpha, colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const WEEK_LABEL_WIDTH = 44;

function cellText(column: MonthColumn): string {
  if (!column.entrena) return '';
  return column.nombre ? column.nombre.slice(0, 3) : '•';
}

function rowLabel(week: PlannedWeek, columns: readonly MonthColumn[]): string {
  const days = columns
    .filter((column) => column.entrena)
    .map((column) => {
      const name = WEEKDAY_NAMES[column.dia].toLowerCase();
      return `${name}${column.nombre ? ` ${column.nombre}` : ''} ${countLabel(column.ejercicios)}`;
    })
    .join(', ');
  return `Semana ${week.numero}${week.esDescarga ? ', descarga' : ''}. ${days}`;
}

/**
 * Vista Mes: una fila por semana y una columna por día de la semana. La
 * semana de descarga se atenúa Y lleva la etiqueta «Descarga» (el estado nunca
 * depende solo del color). Cada fila es un único elemento accesible, con la
 * semana, si es descarga y qué se entrena cada día.
 */
export function RoutineMonthGrid({
  semanas,
  columnas,
  onSelectWeek,
}: {
  semanas: readonly PlannedWeek[];
  columnas: readonly MonthColumn[];
  onSelectWeek?: (numero: number) => void;
}) {
  return (
    <View accessibilityLabel="Vista Mes" style={{ gap: spacing.xs }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={{ width: WEEK_LABEL_WIDTH }} />
        {WEEKDAYS.map((dia) => (
          <Text
            key={dia}
            style={{
              flex: 1,
              textAlign: 'center',
              color: colors.textMuted,
              fontSize: fontSizes.xs,
              fontWeight: semibold,
            }}
          >
            {WEEKDAY_INITIALS[dia]}
          </Text>
        ))}
      </View>
      {semanas.map((week) => {
        return (
          <PressableScale
            accessibilityLabel={rowLabel(week, columnas)}
            disabled={!onSelectWeek}
            haptic="selection"
            key={week.numero}
            onPress={() => onSelectWeek?.(week.numero)}
            scaleTo={0.99}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              minHeight: minTouchTarget,
              borderRadius: radii.md,
              backgroundColor: week.esDescarga ? colors.surfaceHigh : colors.surfaceLow,
              opacity: week.esDescarga ? 0.8 : 1,
              paddingVertical: spacing.xs,
            }}
            testID={`week-row-${week.numero}`}
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ width: WEEK_LABEL_WIDTH, alignItems: 'center' }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSizes.sm,
                  fontWeight: semibold,
                }}
              >
                {`S${week.numero}`}
              </Text>
              {week.esDescarga ? (
                <Text
                  style={{
                    color: colors.warning,
                    fontSize: fontSizes.xs,
                    fontWeight: semibold,
                  }}
                >
                  Descarga
                </Text>
              ) : null}
            </View>
            {columnas.map((column) => (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                key={column.dia}
                style={{
                  flex: 1,
                  height: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.sm,
                  backgroundColor: column.entrena ? alpha(colors.volt, 0.13) : 'transparent',
                }}
              >
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.xs }}>
                  {cellText(column)}
                </Text>
              </View>
            ))}
          </PressableScale>
        );
      })}
    </View>
  );
}
