import { Text } from 'react-native';
import { PressableScale } from '@/components/motion';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import {
  accentContrast,
  colors,
  fontSizes,
  minTouchTarget,
  motion,
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
  const reduceMotion = useReduceMotion();
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      haptic="selection"
      onPress={onSelect}
      scaleTo={0.95}
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: minTouchTarget,
        minWidth: minWidth ?? minTouchTarget,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: selected ? colors.volt : colors.border,
        backgroundColor: selected ? colors.volt : colors.surface,
        paddingHorizontal: spacing.md,
        // El relleno viaja de un estado a otro; con «Reducir movimiento», nada.
        transitionProperty: ['backgroundColor', 'borderColor'],
        transitionDuration: reduceMotion ? 0 : motion.enter,
        transitionTimingFunction: 'ease-out',
      }}
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
    </PressableScale>
  );
}
