import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
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
import type { NodeState } from '@/features/workout/review-state';
import { accentContrast, alpha, colors, iconSizes, radii, spacing, stagger } from '@/theme';

export type { NodeState } from '@/features/workout/review-state';

const NODE = 30;
/** Gap between the circle and the start of the connector. */
const RAIL_OFFSET = NODE + 2;

/**
 * Un nodo del flujo: círculo en el raíl izquierdo, el contenido a la derecha y
 * un trazo jade que baja hasta el siguiente nodo y se dibuja al entrar. El
 * estado se lee por forma (✓ lleno · número con aro · número tenue), no solo
 * por color.
 *
 * The connector is absolutely positioned inside the rail column, which
 * stretches to the row height set by the content. It must never be sized from
 * a measured height of this same row: that feeds back (the line makes the row
 * taller, the taller row makes the line taller…) and the page grows forever.
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
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const last = index === total - 1;
  useEffect(() => {
    if (reduceMotion) draw.value = 1;
    else draw.value = withDelay(index * stagger * 2, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [draw, index, reduceMotion]);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: draw.value }] }));
  const filled = state === 'done';
  const ink = filled ? accentContrast() : state === 'partial' ? colors.volt : colors.textMuted;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.delay(index * stagger).duration(260)}
      style={{ flexDirection: 'row', gap: spacing.sm }}
      testID={`review-node-${index}`}
    >
      <View style={{ width: NODE, alignItems: 'center', overflow: 'hidden' }}>
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
        {!last ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: RAIL_OFFSET,
                bottom: 0,
                left: (NODE - 2) / 2,
                width: 2,
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

