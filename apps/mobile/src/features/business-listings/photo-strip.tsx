import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';
import { MediaImage } from '@/components/media-image';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, minTouchTarget, overlay, radii, spacing } from '@/theme';

const SIZE = 96;

/**
 * A horizontal row of photos with «Quitar» on each and «Añadir» at the end.
 * Used for the photos picked before a listing exists, a saved listing's photos
 * and the profile gallery.
 */
export function PhotoStrip({
  uris,
  onAdd,
  onRemove,
  canAdd,
  busy = false,
  label,
}: {
  uris: string[];
  onAdd: () => void;
  onRemove?: (index: number) => void;
  canAdd: boolean;
  busy?: boolean;
  label: string;
}) {
  return (
    <ScrollView accessibilityLabel={label} contentContainerStyle={{ gap: spacing.sm }} horizontal showsHorizontalScrollIndicator={false}>
      {uris.map((uri, index) => (
        <View key={uri} style={{ width: SIZE, height: SIZE }}>
          <MediaImage accessibilityLabel={`Foto ${index + 1}`} style={{ width: SIZE, height: SIZE, borderRadius: radii.md, borderCurve: 'continuous' }} uri={uri} />
          {onRemove ? (
            <PressableScale
              accessibilityLabel={`Quitar la foto ${index + 1}`}
              disabled={busy}
              hitSlop={6}
              onPress={() => onRemove(index)}
              scaleTo={0.94}
              style={{
                position: 'absolute',
                top: spacing.xs,
                right: spacing.xs,
                width: iconSizes.lg + spacing.sm,
                height: iconSizes.lg + spacing.sm,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: overlay.scrimSoft,
              }}
            >
              <Ionicons color={colors.text} name="close" size={iconSizes.sm} />
            </PressableScale>
          ) : null}
        </View>
      ))}
      {canAdd ? (
        <PressableScale
          accessibilityLabel="Añadir foto"
          disabled={busy}
          onPress={onAdd}
          style={{
            width: SIZE,
            height: SIZE,
            minHeight: minTouchTarget,
            borderRadius: radii.md,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.borderControl,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xxs,
          }}
        >
          <Ionicons color={colors.textSecondary} name="add" size={iconSizes.md} />
          <Text tone="secondary" variant="footnote">
            Añadir
          </Text>
        </PressableScale>
      ) : null}
    </ScrollView>
  );
}
