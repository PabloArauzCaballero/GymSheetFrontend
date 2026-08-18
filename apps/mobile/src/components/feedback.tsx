import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { resolveError } from '@/notifications';
import { colors, fontSizes, iconSizes, radii, spacing } from '@/theme';

/**
 * Placeholder shown while a query is in flight. Blocks of the right shape beat
 * a spinner: the screen does not jump once the data lands.
 *
 * The slow pulse is the difference between "loading" and "broken" — a static
 * grey box reads as a dead layout, a breathing one reads as work in progress.
 */
export function Skeleton({ height = 72 }: { height?: number }) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [progress, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: 0.45 + progress.value * 0.35 }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          height,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          backgroundColor: colors.surfaceHigh,
        },
        animated,
      ]}
    />
  );
}

function CenteredState({
  icon,
  title,
  message,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        gap: spacing.sm,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceLow,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
      }}
    >
      {/* Decorative: the title and message already carry the meaning, so the
          glyph is hidden from the accessibility tree instead of read aloud. */}
      <Ionicons
        accessibilityElementsHidden
        color={colors.textMuted}
        importantForAccessibility="no-hide-descendants"
        name={icon}
        size={iconSizes.xl}
      />
      <Text
        style={{
          color: colors.text,
          fontSize: fontSizes.md,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: fontSizes.sm,
          lineHeight: 20,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
      {children}
    </View>
  );
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}) {
  return <CenteredState icon={icon} message={message} title={title} />;
}

/**
 * Failure with a way out. The copy comes from the notifications engine, so a
 * screen never invents its own wording for the same backend error.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const resolved = resolveError(error);
  return (
    <CenteredState icon="cloud-offline-outline" message={resolved.message} title={resolved.title}>
      <Button label="Reintentar" onPress={onRetry} style={{ marginTop: spacing.xs }} />
    </CenteredState>
  );
}
