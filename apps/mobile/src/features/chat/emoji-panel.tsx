import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import { EMOJI_SECTIONS } from './emoji-sections';

const COLUMNS = 8;
export const EMOJI_PANEL_HEIGHT = 300;

/**
 * Panel de emojis debajo del redactor, donde iría el teclado, como en WhatsApp.
 * Vive dentro de la pantalla y no en un `Modal`: el selector anterior abría su
 * propia ventana encima del teclado y en el iPhone no respondía.
 */
export function EmojiPanel({
  onPick,
  onBackspace,
  onShowKeyboard,
}: {
  onPick: (emoji: string) => void;
  onBackspace: () => void;
  onShowKeyboard: () => void;
}) {
  const [width, setWidth] = useState(0);
  const cell = Math.floor((width - spacing.xs * 2) / COLUMNS);

  return (
    <View
      style={{
        height: EMOJI_PANEL_HEIGHT,
        marginTop: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      testID="chat-emoji-panel"
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xs, paddingBottom: spacing.sm }} keyboardShouldPersistTaps="always">
        {cell > 0 && EMOJI_SECTIONS.map((section) => (
          <View key={section.title}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.xs,
                fontWeight: semibold,
                textTransform: 'uppercase',
                paddingHorizontal: spacing.xs,
                paddingTop: spacing.sm,
                paddingBottom: spacing.xs,
              }}
            >
              {section.title}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {section.emojis.map((emoji) => (
                <Pressable
                  accessibilityLabel={emoji}
                  accessibilityRole="button"
                  key={emoji}
                  onPress={() => onPick(emoji)}
                  style={({ pressed }) => ({
                    width: cell,
                    height: cell,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radii.md,
                    backgroundColor: pressed ? colors.surfaceHigh : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: Math.min(30, cell * 0.66) }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
        }}
      >
        <PressableScale
          accessibilityLabel="Volver al teclado"
          haptic="none"
          onPress={onShowKeyboard}
          scaleTo={0.92}
          style={{ minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          <Ionicons color={colors.textMuted} name="keypad-outline" size={iconSizes.md} />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Teclado</Text>
        </PressableScale>
        <PressableScale
          accessibilityLabel="Borrar"
          haptic="light"
          onPress={onBackspace}
          scaleTo={0.9}
          style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
          testID="chat-emoji-backspace"
        >
          <Ionicons color={colors.text} name="backspace-outline" size={iconSizes.md + 2} />
        </PressableScale>
      </View>
    </View>
  );
}
