import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

export interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

const PADDING = 3;
const GAP = 2;

/**
 * Control de dos o tres opciones excluyentes. Sin acento: la opción activa se
 * marca con luminancia y peso, no con color, porque el acento de la pantalla
 * queda reservado para lo que se resalta en la figura.
 *
 * La marca de la opción activa es una sola píldora que se desliza de una a
 * otra: así se lee como un interruptor con dos posiciones y no como cuatro
 * pestañas sueltas, y el movimiento dice hacia dónde ha cambiado.
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
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const segment = width > 0 ? (width - PADDING * 2 - GAP * (options.length - 1)) / options.length : 0;
  const offset = useSharedValue(0);

  useEffect(() => {
    const next = index * (segment + GAP);
    offset.value = reduceMotion || segment === 0
      ? next
      : withTiming(next, { duration: 240, easing: Easing.bezier(0.2, 0, 0, 1) });
  }, [index, segment, reduceMotion, offset]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flex: 1,
        flexDirection: 'row',
        padding: PADDING,
        gap: GAP,
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHigh,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PADDING,
              bottom: PADDING,
              left: PADDING,
              width: segment,
              borderRadius: radii.full,
              backgroundColor: colors.surfaceHighest,
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            },
            pill,
          ]}
        />
      ) : null}
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
            style={({ pressed }) => ({
              flex: 1,
              minHeight: minTouchTarget - 8,
              paddingHorizontal: spacing.sm,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed && !active ? 0.6 : 1,
            })}
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
