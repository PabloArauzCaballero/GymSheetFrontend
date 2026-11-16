import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, comfortableTouchTarget, iconSizes, radii, spacing } from '@/theme';

/**
 * Fila que abre algo: arte a la izquierda, dos líneas de texto y un chevrón
 * que dice que lleva a otra parte. Al pulsar se hunde la fila entera (háptico
 * `light`: fila que navega, según el mapa de C8.1).
 */
export function NavRow({
  leading,
  title,
  subtitle,
  meta,
  onPress,
  testID,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  /** Elemento pequeño al final, p. ej. un Badge. */
  meta?: ReactNode;
  onPress: () => void;
  testID?: string;
}) {
  // Past Dynamic Type ×1.3 the art beside the text left titles too narrow («Notificacione/s» at 393): it goes on
  // its own line above them, as iOS accessibility layouts do. Nothing is dropped (the Chat art carries a count).
  const { fontScale } = useWindowDimensions();
  const stacked = Boolean(leading) && fontScale > 1.3;
  return (
    <PressableScale
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        minHeight: comfortableTouchTarget,
        paddingVertical: spacing.sm,
      }}
      testID={testID}
    >
      {stacked ? null : leading}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        {stacked ? <View style={{ alignSelf: 'flex-start', marginBottom: spacing.xxs }}>{leading}</View> : null}
        {/* Never truncated: titles carry prefixes («Plan del coach — Hipertrofia PPL») and what a «…» cuts is
            what tells rows apart; a 2-line cap still cut subtitles at 320 and at Dynamic Type XL. Rows grow. */}
        <Text variant="headline">
          {title}
        </Text>
        {subtitle ? (
          <Text tone="muted" variant="subhead">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta}
      <Ionicons
        accessibilityElementsHidden
        color={colors.textMuted}
        importantForAccessibility="no-hide-descendants"
        name="chevron-forward"
        size={iconSizes.md}
      />
    </PressableScale>
  );
}

/** Bloque compacto clave/valor: objetivo de una serie o una medida. */
export function MetricChip({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        gap: spacing.xxs,
        borderRadius: radii.md,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceHighest,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
      }}
    >
      <Text strong tabular>
        {value}
      </Text>
      <Text tone="muted" variant="caption">
        {label}
      </Text>
    </View>
  );
}
