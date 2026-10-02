import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

export interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Control de dos o tres opciones excluyentes. Sin acento: la opción activa se
 * marca con luminancia y peso, no con color, porque el acento de la pantalla
 * queda reservado para lo que se resalta en la figura.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Lo que lee un lector de pantalla para el grupo («Cara del cuerpo»). */
  label: string;
}) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      style={{
        flex: 1,
        flexDirection: 'row',
        padding: 3,
        gap: 2,
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHigh,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            hitSlop={{ top: 4, bottom: 4 }}
            key={option.value}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              minHeight: minTouchTarget - 8,
              paddingHorizontal: spacing.sm,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.surfaceHighest : 'transparent',
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: active ? colors.text : colors.textMuted,
                fontSize: fontSizes.sm,
                fontWeight: active ? semibold : '500',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
