import type { GymDirectoryEntry } from '@gymsheet/schemas';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { DirectoryCardFace } from '@/components/directory-card';
import { accentPolicy, alpha, colors, fontSizes, ink, radii, spacing } from '@/theme';

type AnimatedViewStyle = ComponentProps<typeof Animated.View>['style'];

const STAMP_TOP = spacing.xl + 10;

/** The verdict under the finger while dragging, driven by the same offset that moves the card. */
function DecisionStamp({
  color,
  label,
  side,
  threshold,
  translateX,
}: {
  color: string;
  label: string;
  side: 'left' | 'right';
  threshold: number;
  translateX: SharedValue<number>;
}) {
  const sign = side === 'left' ? 1 : -1;
  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max((sign * translateX.value) / threshold, 0), 1),
  }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: STAMP_TOP,
          left: side === 'left' ? spacing.lg : undefined,
          right: side === 'right' ? spacing.lg : undefined,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radii.md,
          borderWidth: 3,
          borderColor: color,
          backgroundColor: alpha(ink.black, 0.3),
          transform: [{ rotate: side === 'left' ? '-12deg' : '12deg' }],
        },
        animated,
      ]}
    >
      <Text maxFontSizeMultiplier={1.2} style={{ color, fontSize: fontSizes.xl, fontWeight: '800', letterSpacing: 1.5 }}>{label}</Text>
    </Animated.View>
  );
}

const frame = {
  borderRadius: radii.xl,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceLow,
} as const;

/**
 * Comunidad's deck: the same `DirectoryCardFace` that Descubrir deals and that
 * «Ver como te ven» previews, so what someone previews is exactly what others
 * get. Taps (photo thirds, bottom band → profile sheet) stay with the screen's
 * gesture, by geometry, as before.
 */
export function DeckStage({
  cardStyle,
  gesture,
  nextCard,
  nextCardStyle,
  onOpenDetail,
  onStepPhoto,
  photoIndex,
  threshold,
  topCard,
  translateX,
}: {
  cardStyle: AnimatedViewStyle;
  gesture: ComponentProps<typeof GestureDetector>['gesture'];
  nextCard: GymDirectoryEntry | null;
  nextCardStyle: AnimatedViewStyle;
  onOpenDetail: () => void;
  onStepPhoto: (delta: number) => void;
  photoIndex: number;
  threshold: number;
  topCard: GymDirectoryEntry;
  translateX: SharedValue<number>;
}) {
  return (
    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
      {nextCard ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, frame, nextCardStyle]}>
          <DirectoryCardFace entry={nextCard} fill />
        </Animated.View>
      ) : null}

      <GestureDetector gesture={gesture}>
        {/* Shadow on the outer layer, clipping on the inner one: on iOS both on one view cancel out. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radii.xl,
              backgroundColor: colors.surfaceLow,
              shadowColor: ink.black,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.45,
              shadowRadius: 20,
              elevation: 10,
            },
            cardStyle,
          ]}
        >
          <View style={[{ flex: 1 }, frame]}>
            <DirectoryCardFace
              entry={topCard}
              fill
              onInfoPress={onOpenDetail}
              onStepPhoto={onStepPhoto}
              photoIndex={photoIndex}
            />
          </View>
          <DecisionStamp color={accentPolicy.ink} label="ME INTERESA" side="left" threshold={threshold} translateX={translateX} />
          <DecisionStamp color={colors.danger} label="PASO" side="right" threshold={threshold} translateX={translateX} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
