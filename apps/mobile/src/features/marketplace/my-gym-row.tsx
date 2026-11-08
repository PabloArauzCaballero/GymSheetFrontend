import { Ionicons } from '@expo/vector-icons';
import type { DirectoryEntitySummary } from '@gymsheet/schemas';
import { View } from 'react-native';
import { MediaImage } from '@/components/media-image';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, radii, spacing } from '@/theme';
import { initials } from './format';

/** «Tu gimnasio» en una fila, no en una tarjeta de portada: lo primero, sin gritar. */
export function MyGymRow({
  gym,
  daysLeft,
  onPress,
}: {
  gym: DirectoryEntitySummary;
  /** Días que le quedan a la membresía activa; `null` si no hay una. */
  daysLeft: number | null;
  onPress: () => void;
}) {
  const status = daysLeft !== null ? `Membresía activa · ${daysLeft} días` : 'Ver planes y pases';
  return (
    <PressableScale
      accessibilityLabel={`Tu gimnasio, ${gym.name}. ${status}`}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        padding: spacing.smd,
        marginBottom: spacing.md,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceHigh,
      }}
    >
      <MediaImage
        uri={gym.logoUrl ?? gym.coverUrl}
        style={{ width: 44, height: 44, borderRadius: radii.md, borderCurve: 'continuous' }}
        fallback={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text strong tone="muted" variant="footnote">
              {initials(gym.name)}
            </Text>
          </View>
        }
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text tone="muted" variant="caption">
          Tu gimnasio
        </Text>
        <Text numberOfLines={1} strong variant="subhead">
          {gym.name}
        </Text>
        <Text numberOfLines={1} tone="secondary" variant="caption">
          {status}
        </Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
    </PressableScale>
  );
}
