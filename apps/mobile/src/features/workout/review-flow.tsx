import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@/components/text';
import { accentContrast, alpha, colors, iconSizes, radii, spacing, stagger } from '@/theme';

const NODE = 30;

export type NodeState = 'done' | 'partial' | 'empty';

/**
 * Un nodo del flujo: círculo en el raíl izquierdo, el contenido a la derecha y
 * un trazo jade que baja hasta el siguiente nodo y se dibuja al entrar. El
 * estado se lee por forma (✓ lleno · número con aro · número tenue), no solo
 * por color.
 */
export function FlowNode({
  index,
  total,
  state,
  branch = false,
  children,
}: {
  index: number;
  total: number;
  state: NodeState;
  /** Superserie o circuito: el nodo es un bifurcador, no un número. */
  branch?: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [height, setHeight] = useState(0);
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const last = index === total - 1;
  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    if (next !== height) {
      setHeight(next);
      if (!reduceMotion) draw.value = withDelay(index * stagger * 2, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    }
  };
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: draw.value }] }));
  const filled = state === 'done';
  const ink = filled ? accentContrast() : state === 'partial' ? colors.volt : colors.textMuted;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.delay(index * stagger).duration(260)}
      onLayout={onLayout}
      style={{ flexDirection: 'row', gap: spacing.sm }}
      testID={`review-node-${index}`}
    >
      <View style={{ width: NODE, alignItems: 'center' }}>
        <View
          style={{
            width: NODE,
            height: NODE,
            borderRadius: branch ? radii.md : radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: filled ? colors.volt : alpha(colors.volt, state === 'partial' ? 0.14 : 0.05),
            borderWidth: 2,
            borderColor: state === 'empty' ? colors.border : colors.volt,
          }}
        >
          {filled ? (
            <Ionicons color={ink} name="checkmark" size={iconSizes.sm} />
          ) : branch ? (
            <Ionicons color={ink} name="git-branch" size={iconSizes.sm} />
          ) : (
            <Text strong style={{ color: ink }} tabular variant="footnote">
              {index + 1}
            </Text>
          )}
        </View>
        {!last && height > NODE ? (
          <Animated.View
            style={[
              {
                width: 2,
                height: height - NODE + spacing.sm,
                marginTop: 2,
                borderRadius: 1,
                backgroundColor: alpha(colors.volt, state === 'empty' ? 0.25 : 0.7),
                transformOrigin: 'top',
              },
              lineStyle,
            ]}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.sm, minWidth: 0 }}>{children}</View>
    </Animated.View>
  );
}

