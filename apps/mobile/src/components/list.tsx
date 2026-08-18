import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/**
 * A row that opens something: artwork on the left, two lines of copy, a
 * chevron to signal it leads somewhere. Pressing dims the whole row — feedback
 * that never changes the layout bounds.
 */
export function NavRow({
  leading,
  title,
  subtitle,
  meta,
  onPress,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  /** Small trailing element, e.g. a Badge. */
  meta?: ReactNode;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget,
        paddingVertical: spacing.sm,
      }}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          // Two lines, not one. At phone width a title sharing a row with a
          // badge and a chevron loses its tail — and these titles are often
          // prefixed ("Plan del coach — Hipertrofia PPL"), so the part that
          // gets cut is precisely the part that tells one row from another.
          numberOfLines={2}
          style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '600' }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta}
      <Ionicons
        accessibilityElementsHidden
        color={colors.textDisabled}
        importantForAccessibility="no-hide-descendants"
        name="chevron-forward"
        size={iconSizes.md}
      />
    </PressableScale>
  );
}

/** Compact key/value block used to describe a set target or a measurement. */
export function MetricChip({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        gap: 2,
        borderRadius: radii.md,
        backgroundColor: colors.surfaceHigh,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: fontSizes.md,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{label}</Text>
    </View>
  );
}
