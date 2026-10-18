import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { PressableScale } from '@/components/motion';
import { accentContrast, chatColors, colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/**
 * El botón redondo de WhatsApp que aparece al subir por el hilo: baja al último
 * mensaje y, si llegaron mensajes mientras tanto, dice cuántos.
 */
export function ScrollToLatestButton({
  visible,
  unread,
  reduceMotion,
  onPress,
}: {
  visible: boolean;
  unread: number;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  if (!visible) return null;
  const label = unread > 0 ? `Bajar al último mensaje. ${unread} sin leer` : 'Bajar al último mensaje';
  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(1) : ZoomIn.duration(180)}
      exiting={reduceMotion ? FadeOut.duration(1) : ZoomOut.duration(140)}
      style={{ position: 'absolute', right: spacing.sm, bottom: spacing.md }}
    >
      <PressableScale
        accessibilityLabel={label}
        accessibilityRole="button"
        haptic="selection"
        onPress={onPress}
        scaleTo={0.92}
        style={{
          width: minTouchTarget,
          height: minTouchTarget,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: chatColors.floatingChip,
          boxShadow: chatColors.bubbleShadow,
        }}
        testID="chat-scroll-to-latest"
      >
        <Ionicons color={colors.text} name="chevron-down" size={iconSizes.md} />
      </PressableScale>
      {unread > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -6,
            right: -4,
            minWidth: 22,
            height: 22,
            paddingHorizontal: 5,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.volt,
          }}
        >
          <Text style={{ color: accentContrast(), fontSize: fontSizes.xs, fontWeight: semibold, fontVariant: ['tabular-nums'] }}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}
