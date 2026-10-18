import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { PressableScale } from '@/components/motion';
import { chatColors, colors, fontSizes, iconSizes, radii, semibold, shadows, spacing } from '@/theme';

export type AttachKind = 'emoji' | 'photo' | 'camera' | 'location' | 'viewOnce';

const ITEMS: Array<{ kind: AttachKind; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap | null }> = [
  { kind: 'emoji', label: 'Emoji', hint: 'Abre el teclado de emojis', icon: 'happy' },
  { kind: 'photo', label: 'Foto', hint: 'Fotos y videos de tu galería', icon: 'images' },
  { kind: 'camera', label: 'Cámara', hint: 'Haz una foto o un video', icon: 'camera' },
  { kind: 'location', label: 'Ubicación', hint: 'Dónde estás ahora o un lugar del mapa', icon: 'location' },
  { kind: 'viewOnce', label: 'Vista única', hint: 'Una foto o un video que se ve una sola vez', icon: null },
];

/**
 * El desplegable del «+»: los cinco iconos (emoji, foto, cámara, ubicación y
 * vista única) en una tarjeta encima del redactor. No es un `Modal`: así el
 * selector de fotos, la cámara o la pantalla del mapa se abren directamente,
 * sin esperar a que se cierre otra hoja (en el iPhone real el segundo no se
 * presentaba).
 */
export function ChatAttachMenu({
  open,
  reduceMotion,
  onPick,
}: {
  open: boolean;
  reduceMotion: boolean;
  onPick: (kind: AttachKind) => void;
}) {
  if (!open) return null;
  return (
    <Animated.View
      accessibilityLabel="Adjuntar"
      entering={reduceMotion ? FadeIn.duration(1) : FadeInDown.duration(200).withInitialValues({ transform: [{ translateY: 12 }] })}
      exiting={reduceMotion ? FadeOut.duration(1) : FadeOut.duration(120)}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceHigh,
        boxShadow: shadows.e2,
      }}
      testID="chat-attach-menu"
    >
      {ITEMS.map((item) => (
        <PressableScale
          accessibilityHint={item.hint}
          accessibilityLabel={item.label}
          accessibilityRole="button"
          haptic="light"
          key={item.kind}
          onPress={() => onPick(item.kind)}
          scaleTo={0.92}
          style={{ flex: 1, alignItems: 'center', gap: 6, minHeight: 72 }}
          testID={`chat-attach-${item.kind}`}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: chatColors.attach[item.kind],
            }}
          >
            {item.icon ? (
              <Ionicons color={chatColors.attachGlyph} name={item.icon} size={iconSizes.md + 2} />
            ) : (
              // El «1» dentro de un aro discontinuo: el signo de vista única de WhatsApp.
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: radii.full,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: chatColors.attachGlyph,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: chatColors.attachGlyph, fontSize: fontSizes.sm, fontWeight: semibold }}>1</Text>
              </View>
            )}
          </View>
          <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSizes.xs }}>{item.label}</Text>
        </PressableScale>
      ))}
    </Animated.View>
  );
}
