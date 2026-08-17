import { useEffect, useRef, useSyncExternalStore } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NotificationSeverity, ToastItem } from '@gymsheet/notifications';
import { colors, fontSizes, minTouchTarget, motion, radii, spacing, tones } from '@/theme';
import { toastQueue } from './notify';
import { useReduceMotion } from './use-reduce-motion';

const TONE: Record<NotificationSeverity, { bg: string; border: string; text: string }> = {
  success: tones.dark.success,
  info: tones.dark.info,
  warning: tones.dark.warning,
  error: tones.dark.danger,
  // `danger` is a modal concept; as a toast it reads like an error.
  danger: tones.dark.danger,
};

/**
 * Renders the toast stack of {@link toastQueue} below the status bar. Mounted
 * once by NotificationRoot; feature screens never render a toast themselves.
 *
 * The container lets touches through (`box-none`) so a toast overlapping the
 * screen never blocks the UI underneath — only the cards themselves are tappable.
 */
export function ToastHost() {
  const items = useSyncExternalStore(
    toastQueue.subscribe,
    toastQueue.getSnapshot,
    toastQueue.getServerSnapshot,
  );
  const insets = useSafeAreaInsets();

  if (items.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.md, gap: spacing.sm },
      ]}
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </View>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const tone = TONE[item.severity];
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // The phone reacts to the outcome before the eye reaches the text: success
    // ticks, failure buzzes. Pending toasts stay silent — nothing happened yet.
    if (!item.pending) {
      const feedback =
        item.severity === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : item.severity === 'warning'
            ? Haptics.NotificationFeedbackType.Warning
            : item.severity === 'error' || item.severity === 'danger'
              ? Haptics.NotificationFeedbackType.Error
              : null;
      if (feedback) void Haptics.notificationAsync(feedback);
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? motion.instant : motion.enter,
      useNativeDriver: true,
    }).start();
  }, [item.pending, item.severity, progress, reduceMotion]);

  const translateY = reduceMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });

  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>
      <Pressable
        accessible
        accessibilityRole="alert"
        accessibilityLabel={[item.title, item.message, item.description]
          .filter(Boolean)
          .join('. ')}
        accessibilityHint={item.dismissible ? 'Toca para descartar el aviso.' : undefined}
        accessibilityLiveRegion="polite"
        disabled={!item.dismissible}
        onPress={() => toastQueue.dismiss(item.id)}
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
          minHeight: minTouchTarget,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: tone.border,
          backgroundColor: tone.bg,
          padding: spacing.md,
          // Lifts the card off the screen content behind it (iOS + Android).
          shadowColor: '#000000',
          shadowOpacity: 0.45,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        })}
      >
        {item.pending ? (
          <ActivityIndicator color={tone.text} size="small" />
        ) : (
          <View
            style={{
              width: 8,
              height: 8,
              marginTop: 6,
              borderRadius: radii.full,
              backgroundColor: tone.text,
            }}
          />
        )}

        <View style={{ flex: 1, gap: spacing.xs }}>
          {item.title ? (
            <Text style={{ color: tone.text, fontSize: fontSizes.sm, fontWeight: '700' }}>
              {item.title}
            </Text>
          ) : null}
          <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 }}>
            {item.message}
          </Text>
          {item.description ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
              {item.description}
            </Text>
          ) : null}
        </View>

        {item.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={spacing.sm}
            onPress={() => {
              item.action?.onClick();
              toastQueue.dismiss(item.id);
            }}
            style={{ justifyContent: 'center', minHeight: minTouchTarget / 2 }}
          >
            <Text style={{ color: tone.text, fontSize: fontSizes.sm, fontWeight: '600' }}>
              {item.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
