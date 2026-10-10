import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';
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
      {leading}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        {/* Dos líneas: los títulos suelen llevar prefijo («Plan del coach —
            Hipertrofia PPL») y lo que se corta es lo que los distingue. */}
        <Text numberOfLines={2} variant="headline">
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} tone="muted" variant="subhead">
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
