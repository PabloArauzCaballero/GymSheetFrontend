import { Pressable, Text } from 'react-native';
import {
  accentContrast,
  colors,
  fontSizes,
  minTouchTarget,
  radii,
  semibold,
  spacing,
} from '@/theme';

/**
 * Opción seleccionable. Las fichas ganan a un selector nativo en estos grupos
 * porque todas las opciones caben en pantalla: la elección se ve, no se esconde
 * detrás de un modal.
 *
 * Lo seleccionado se distingue por relleno Y por el estado de accesibilidad
 * `selected` (que es lo que anuncia VoiceOver); el color nunca es la única pista.
 */
export function ChoiceChip({
  label,
  selected,
  onSelect,
  accessibilityLabel,
  testID,
  minWidth,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  accessibilityLabel?: string;
  testID?: string;
  minWidth?: number;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => ({
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: minTouchTarget,
        minWidth: minWidth ?? minTouchTarget,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: selected ? colors.volt : colors.border,
        backgroundColor: selected ? colors.volt : colors.surface,
        paddingHorizontal: spacing.md,
        opacity: pressed ? 0.75 : 1,
      })}
      testID={testID}
    >
      <Text
        style={{
          color: selected ? accentContrast() : colors.text,
          fontSize: fontSizes.sm,
          fontWeight: semibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
