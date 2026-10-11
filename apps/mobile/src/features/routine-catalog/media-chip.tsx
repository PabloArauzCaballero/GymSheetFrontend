import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { iconSizes, mediaChip, radii, semibold, spacing } from '@/theme';

/**
 * Chip de vidrio para ir ENCIMA de una imagen (objetivo, días). Desenfoca lo
 * de debajo y lleva un velo oscuro, así el texto blanco se lee igual sobre una
 * foto clara que sobre una oscura. Es un dato, no un control: no se toca.
 */
export function MediaChip({ label, icon }: { label: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radii.full,
        borderCurve: 'continuous',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: mediaChip.border,
        overflow: 'hidden',
      }}
    >
      <BlurView intensity={24} style={StyleSheet.absoluteFill} tint="dark" />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.smd,
          paddingVertical: spacing.xs + 1,
          backgroundColor: mediaChip.bg,
        }}
      >
        {icon ? <Ionicons color={mediaChip.text} name={icon} size={iconSizes.xs + 2} /> : null}
        <Text style={{ color: mediaChip.text, fontWeight: semibold }} variant="caption">
          {label}
        </Text>
      </View>
    </View>
  );
}
