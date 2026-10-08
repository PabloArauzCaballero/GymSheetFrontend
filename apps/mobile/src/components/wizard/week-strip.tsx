import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text, View } from 'react-native';
import { WEEKDAY_NAMES, countLabel, type DraftDay, type Weekday } from '@gymsheet/hooks';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/**
 * Los días de entrenamiento de la semana como filas grandes (una tira vertical:
 * siete columnas no dejarían leer el nombre del día ni su recuento en un móvil).
 *
 * - Toque simple: edita ese día.
 * - Toque sostenido (500 ms, el valor por defecto de `Pressable`) con háptico de
 *   selección: entra al modo de selección múltiple con ese día marcado.
 * - En modo selección cada toque marca o desmarca, y aparecen las casillas.
 *
 * El toque sostenido nunca es el único camino: el botón «Seleccionar» de la
 * pantalla lleva al mismo modo (lectores de pantalla y quien no lo descubra).
 */
export function WeekStrip({
  dias,
  seleccion,
  onEdit,
  onStartSelection,
  onToggle,
}: {
  dias: readonly DraftDay[];
  /** `null` = modo selección apagado. */
  seleccion: readonly Weekday[] | null;
  onEdit: (dia: Weekday) => void;
  onStartSelection: (dia: Weekday) => void;
  onToggle: (dia: Weekday) => void;
}) {
  const selecting = seleccion !== null;
  return (
    <View accessibilityRole="list" style={{ gap: spacing.sm }}>
      {dias.map((day) => {
        const checked = seleccion?.includes(day.diaSemana) ?? false;
        const name = WEEKDAY_NAMES[day.diaSemana];
        const subtitle = [day.nombre.trim(), countLabel(day.ejercicios.length)]
          .filter(Boolean)
          .join(' · ');
        return (
          <PressableScale
            accessibilityHint={
              selecting ? 'Toca para marcar o desmarcar' : 'Toca para editar. Mantén pulsado para seleccionar varios.'
            }
            accessibilityLabel={`${name}. ${subtitle}`}
            accessibilityRole={selecting ? 'checkbox' : 'button'}
            accessibilityState={selecting ? { checked } : undefined}
            haptic={selecting ? 'selection' : 'light'}
            key={day.diaSemana}
            onLongPress={() => {
              if (selecting) return;
              void Haptics.selectionAsync();
              onStartSelection(day.diaSemana);
            }}
            onPress={() => (selecting ? onToggle(day.diaSemana) : onEdit(day.diaSemana))}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: minTouchTarget + spacing.lg,
              paddingHorizontal: spacing.lg,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: checked ? colors.volt : colors.borderSubtle,
              backgroundColor: checked ? `${colors.volt}14` : colors.surfaceLow,
            }}
            testID={`day-row-${day.diaSemana}`}
          >
            {selecting ? (
              <Ionicons
                accessibilityElementsHidden
                color={checked ? colors.volt : colors.textDisabled}
                importantForAccessibility="no-hide-descendants"
                name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={iconSizes.lg}
              />
            ) : null}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
                {name}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                {subtitle}
              </Text>
            </View>
            {selecting ? null : (
              <Ionicons
                accessibilityElementsHidden
                color={colors.textDisabled}
                importantForAccessibility="no-hide-descendants"
                name="chevron-forward"
                size={iconSizes.md}
              />
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}
