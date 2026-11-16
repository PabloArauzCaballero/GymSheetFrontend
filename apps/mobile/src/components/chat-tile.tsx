import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { ChatDot } from '@/components/chat-dot';
import { chat, colors, iconSizes, radii, spacing } from '@/theme';

/** Row glyph column width: plain glyphs centre in it, so titles align with Chat's tile. */
export const ROW_GLYPH_WIDTH = iconSizes.lg + spacing.smd;
const TILE = iconSizes.lg + spacing.xs;

/**
 * Chat's icon tile for a list row: the vibrant gradient with a white glyph and,
 * when chats wait for a reply, the glowing dot with the figure at its tip.
 * Decorative: the row's label carries the words.
 */
export function ChatTile({ count = 0, pulseKey = 0 }: { count?: number; pulseKey?: number }) {
  return (
    // Centred in the rows' glyph column (titles align); the dot sits on the tile's corner, clear of the text.
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: ROW_GLYPH_WIDTH, alignItems: 'center' }}>
      <View style={{ width: TILE, height: TILE }}>
      <LinearGradient colors={[chat.fillFrom, chat.fillTo]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={{ flex: 1, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons color={chat.onFill} name="chatbubbles" size={iconSizes.sm} />
      </LinearGradient>
      {count > 0 ? <ChatDot count={count} halo={colors.surface} pulseKey={pulseKey} style={{ position: 'absolute', top: -spacing.sm, right: -spacing.sm }} /> : null}
      </View>
    </View>
  );
}
