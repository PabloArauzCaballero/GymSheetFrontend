import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { iconSizes, mediaChip, overlay, radii, semibold, spacing } from '@/theme';

/**
 * Chip para ir ENCIMA de una imagen (objetivo, días). Es un dato, no un
 * control: no se toca.
 *
 * Fondo sólido translúcido, sin `BlurView` (2026-10-18): el chip va en cada
 * tarjeta de una lista y un desenfoque por fila es una capa de composición más
 * por cada una. El velo es `overlay.scrimSoft` (negro al 60 %), no
 * `mediaChip.bg` (50 %): sin el desenfoque que lo ayudaba, el 50 % sobre una
 * foto blanca deja #808080 detrás y el blanco se queda en 3,9:1. Al 60 % el
 * peor caso (foto blanca pura, sin velo de portada) es #666666 → 5,7:1; sobre
 * la portada más oscura (velo #0c0c0b) pasa de 18:1.
 */
export function MediaChip({ label, icon }: { label: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.smd,
        paddingVertical: spacing.xs + 1,
        borderRadius: radii.full,
        borderCurve: 'continuous',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: mediaChip.border,
        backgroundColor: overlay.scrimSoft,
      }}
    >
      {icon ? <Ionicons color={mediaChip.text} name={icon} size={iconSizes.xs + 2} /> : null}
      <Text style={{ color: mediaChip.text, fontWeight: semibold }} variant="caption">
        {label}
      </Text>
    </View>
  );
}
