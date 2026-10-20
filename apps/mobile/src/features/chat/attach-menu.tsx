import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut } from 'react-native-reanimated';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, shadows, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Dónde abrir el menú: su esquina inferior izquierda, justo encima del «+». */
export type AttachAnchor = { left: number; bottom: number };

function MenuRow({
  icon,
  label,
  onPress,
  trailing,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget + 4,
        paddingHorizontal: spacing.md,
        backgroundColor: pressed ? colors.surfaceHigh : 'transparent',
      })}
      testID={testID}
    >
      <Ionicons color={colors.text} name={icon} size={iconSizes.md + 2} />
      <Text style={{ flex: 1, color: colors.text, fontSize: fontSizes.md }}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

/**
 * El desplegable del «+»: emojis, fotos y videos, cámara, ubicación y vista
 * única, que antes eran cinco iconos sueltos aplastando el campo de texto.
 *
 * Es una capa dentro de la pantalla y no un `Modal`: en el iPhone, abrir el
 * selector de fotos mientras un `Modal` todavía se está cerrando no presenta
 * nada, y por eso las fotos no salían.
 */
export function AttachMenu({
  visible,
  anchor,
  onClose,
  onEmoji,
  onGallery,
  onCamera,
  onLocation,
  viewOnce,
  onToggleViewOnce,
}: {
  visible: boolean;
  anchor: AttachAnchor | null;
  onClose: () => void;
  onEmoji: () => void;
  onGallery: () => void;
  onCamera: () => void;
  onLocation: () => void;
  viewOnce: boolean;
  onToggleViewOnce: () => void;
}) {
  if (!visible || !anchor) return null;
  const pick = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }}>
      <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(100)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Pressable accessibilityLabel="Cerrar menú" onPress={onClose} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        entering={FadeInUp.duration(160)}
        style={{
          position: 'absolute',
          left: anchor.left,
          bottom: anchor.bottom,
          width: 250,
          paddingVertical: spacing.xs,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          boxShadow: shadows.e2,
        }}
        testID="chat-attach-menu"
      >
        <MenuRow icon="happy-outline" label="Emojis" onPress={pick(onEmoji)} testID="chat-attach-emoji" />
        <MenuRow icon="images-outline" label="Fotos y videos" onPress={pick(onGallery)} testID="chat-attach-gallery" />
        <MenuRow icon="camera-outline" label="Cámara" onPress={pick(onCamera)} testID="chat-attach-camera" />
        <MenuRow icon="location-outline" label="Ubicación" onPress={pick(onLocation)} testID="chat-attach-location" />
        <MenuRow
          icon="eye-outline"
          label="Vista única"
          onPress={pick(onToggleViewOnce)}
          testID="chat-attach-view-once"
          trailing={
            <Ionicons
              color={viewOnce ? colors.volt : colors.textMuted}
              name={viewOnce ? 'checkmark-circle' : 'ellipse-outline'}
              size={iconSizes.md}
            />
          }
        />
      </Animated.View>
    </View>
  );
}
